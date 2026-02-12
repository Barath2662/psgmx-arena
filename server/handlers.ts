import { Server, Socket } from 'socket.io';
import {
  getSessionRoom,
  getInstructorRoom,
  type ServerToClientEvents,
  type ClientToServerEvents,
} from '../src/types/socket';
import {
  redis,
  setSessionState,
  getSessionState,
  updateLeaderboard,
  getLeaderboard,
  setTimer,
  getTimerRemaining,
  sessionKeys,
} from '../src/lib/redis';

// In-memory session tracking
const sessionParticipantCount: Map<string, number> = new Map();
const participantSocketMap: Map<string, string> = new Map(); // participantId -> socketId
const socketParticipantMap: Map<string, { sessionId: string; participantId: string }> = new Map();

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`🔌 Connected: ${socket.id}`);

    // ─── JOIN SESSION ──────────────────────────────────────

    socket.on('JOIN_SESSION', async ({ sessionId, participantId }: { sessionId: string; participantId: string }) => {
      const room = getSessionRoom(sessionId);
      socket.join(room);

      // Track mapping
      participantSocketMap.set(participantId, socket.id);
      socketParticipantMap.set(socket.id, { sessionId, participantId });

      // Update count
      const count = (sessionParticipantCount.get(sessionId) || 0) + 1;
      sessionParticipantCount.set(sessionId, count);

      // Notify room
      io.to(room).emit('PARTICIPANT_JOINED', {
        id: participantId,
        name: '', // Resolved client-side
        count,
      });

      // Send current state
      const state = await getSessionState(sessionId);
      if (state) {
        const questionIndex = await redis.get(sessionKeys.currentQuestion(sessionId));
        socket.emit('SESSION_STATE_CHANGE', {
          state,
          currentQuestionIndex: parseInt(questionIndex || '0', 10),
        });
      }

      // Send timer if active
      const remaining = await getTimerRemaining(sessionId);
      if (remaining > 0) {
        socket.emit('TIMER_SYNC', { remaining });
      }
    });

    // ─── LEAVE SESSION ─────────────────────────────────────

    socket.on('LEAVE_SESSION', ({ sessionId }: { sessionId: string }) => {
      handleDisconnect(socket, io, sessionId);
    });

    // ─── INSTRUCTOR: START SESSION ─────────────────────────

    socket.on('START_SESSION', async ({ sessionId }: { sessionId: string }) => {
      const room = getSessionRoom(sessionId);
      
      await setSessionState(sessionId, 'QUESTION_ACTIVE');
      await redis.set(sessionKeys.currentQuestion(sessionId), '0');

      io.to(room).emit('SESSION_STATE_CHANGE', {
        state: 'QUESTION_ACTIVE',
        currentQuestionIndex: 0,
      });
    });

    // ─── INSTRUCTOR: NEXT QUESTION ─────────────────────────

    socket.on('NEXT_QUESTION', async ({ sessionId }: { sessionId: string }) => {
      const room = getSessionRoom(sessionId);
      const currentStr = await redis.get(sessionKeys.currentQuestion(sessionId));
      const next = (parseInt(currentStr || '0', 10)) + 1;

      await redis.set(sessionKeys.currentQuestion(sessionId), next.toString());
      await setSessionState(sessionId, 'QUESTION_ACTIVE');

      io.to(room).emit('SESSION_STATE_CHANGE', {
        state: 'QUESTION_ACTIVE',
        currentQuestionIndex: next,
      });
    });

    // ─── INSTRUCTOR: LOCK QUESTION ─────────────────────────

    socket.on('LOCK_QUESTION', async ({ sessionId }: { sessionId: string }) => {
      const room = getSessionRoom(sessionId);
      await setSessionState(sessionId, 'LOCKED');

      const currentStr = await redis.get(sessionKeys.currentQuestion(sessionId));
      const questionIndex = parseInt(currentStr || '0', 10);

      io.to(room).emit('QUESTION_LOCK', { questionIndex });
      io.to(room).emit('SESSION_STATE_CHANGE', {
        state: 'LOCKED',
        currentQuestionIndex: questionIndex,
      });
    });

    // ─── INSTRUCTOR: SHOW RESULTS ──────────────────────────

    socket.on('SHOW_RESULTS', async ({ sessionId }: { sessionId: string }) => {
      const room = getSessionRoom(sessionId);
      await setSessionState(sessionId, 'RESULTS');

      const currentStr = await redis.get(sessionKeys.currentQuestion(sessionId));
      const questionIndex = parseInt(currentStr || '0', 10);

      // Get leaderboard from Redis
      const leaderboard = await getLeaderboard(sessionId, 20);

      io.to(room).emit('SESSION_STATE_CHANGE', {
        state: 'RESULTS',
        currentQuestionIndex: questionIndex,
      });

      io.to(room).emit('QUESTION_RESULTS', {
        questionIndex,
        correctAnswer: '', // Sent via API
        stats: {
          totalAnswers: 0,
          correctCount: 0,
          accuracy: 0,
          avgTimeMs: 0,
          distribution: {},
        },
        leaderboard: leaderboard.map((entry, i) => ({
          ...entry,
          name: '',
          rank: i + 1,
          streak: 0,
        })),
      });
    });

    // ─── INSTRUCTOR: END SESSION ───────────────────────────

    socket.on('END_SESSION', async ({ sessionId }: { sessionId: string }) => {
      const room = getSessionRoom(sessionId);
      await setSessionState(sessionId, 'COMPLETED');

      const leaderboard = await getLeaderboard(sessionId, 100);

      io.to(room).emit('SESSION_STATE_CHANGE', {
        state: 'COMPLETED',
        currentQuestionIndex: -1,
      });

      io.to(room).emit('SESSION_COMPLETE', {
        finalLeaderboard: leaderboard.map((entry, i) => ({
          ...entry,
          name: '',
          rank: i + 1,
          streak: 0,
        })),
        analytics: {
          totalParticipants: sessionParticipantCount.get(sessionId) || 0,
          avgScore: 0,
          medianScore: 0,
          completionRate: 100,
          questionStats: [],
        },
      });

      // Cleanup Redis after 5 minutes
      setTimeout(async () => {
        const keys = await redis.keys(`session:${sessionId}:*`);
        if (keys.length > 0) await redis.del(...keys);
        const lbKey = `leaderboard:${sessionId}`;
        await redis.del(lbKey);
      }, 5 * 60 * 1000);
    });

    // ─── STUDENT: SUBMIT ANSWER ────────────────────────────

    socket.on('SUBMIT_ANSWER', async ({ sessionId, participantId, questionId, answerData, timeTakenMs }: { sessionId: string; participantId: string; questionId: string; answerData: any; timeTakenMs: number }) => {
      const room = getSessionRoom(sessionId);
      const currentStr = await redis.get(sessionKeys.currentQuestion(sessionId));
      const questionIndex = parseInt(currentStr || '0', 10);

      // Store answer count in Redis
      const answerKey = sessionKeys.answers(sessionId, questionIndex);
      const count = await redis.incr(answerKey);
      await redis.expire(answerKey, 86400);

      const totalParticipants = sessionParticipantCount.get(sessionId) || 0;

      // Broadcast answer count to instructor
      io.to(room).emit('ANSWER_COUNT_UPDATE', {
        questionIndex,
        count,
        total: totalParticipants,
      });
    });

    // ─── STUDENT: USE POWER-UP ─────────────────────────────

    socket.on('USE_POWER_UP', async ({ sessionId, participantId, type, questionIndex }: { sessionId: string; participantId: string; type: string; questionIndex: number }) => {
      const room = getSessionRoom(sessionId);

      io.to(room).emit('POWER_UP_USED', {
        participantId,
        type,
        questionIndex,
      });
    });

    // ─── DISCONNECT ────────────────────────────────────────

    socket.on('disconnect', () => {
      const mapping = socketParticipantMap.get(socket.id);
      if (mapping) {
        handleDisconnect(socket, io, mapping.sessionId);
      }
      console.log(`🔌 Disconnected: ${socket.id}`);
    });
  });

  // Timer broadcast interval (every second for active sessions)
  setInterval(async () => {
    for (const [sessionId] of sessionParticipantCount) {
      const state = await getSessionState(sessionId);
      if (state === 'QUESTION_ACTIVE') {
        const remaining = await getTimerRemaining(sessionId);
        if (remaining > 0) {
          io.to(getSessionRoom(sessionId)).emit('TIMER_SYNC', { remaining });
        }
      }
    }
  }, 1000);
}

function handleDisconnect(
  socket: Socket,
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  sessionId: string
) {
  const room = getSessionRoom(sessionId);
  socket.leave(room);

  const mapping = socketParticipantMap.get(socket.id);
  if (mapping) {
    participantSocketMap.delete(mapping.participantId);
    socketParticipantMap.delete(socket.id);

    const count = Math.max(0, (sessionParticipantCount.get(sessionId) || 1) - 1);
    sessionParticipantCount.set(sessionId, count);

    io.to(room).emit('PARTICIPANT_LEFT', {
      id: mapping.participantId,
      count,
    });
  }
}
