import { GroupBuyingRepository } from '../repositories/group.buying.repositories'

import {
  CreateGroupSessionDTO,
  UpdateGroupSessionDTO,
  JoinGroupDTO,
  GroupSessionFilters
} from '../types'

export class GroupBuyingService {
    private repository: GroupBuyingRepository;

    constructor() {
        this.repository = new GroupBuyingRepository()
    }

    async createSession(data: CreateGroupSessionDTO) {
        if(data.targetMoq < 2) {
            throw new Error('Minimum order quantity (moq) must be at least 2');
        }
        if(data.groupPrice <= 0) {
            throw new Error('Group price must be greater than 0')
        }
        if(data.endTime <= new Date()) {
            throw new Error('End time must be in the future')
        }

        const startTime = data.startTime || new Date()
        if(data.sessionCode) {
            const exists = await this.repository.sessionCodeExists(data.sessionCode)
            if(exists) {
                throw new Error(`Session code ${data.sessionCode} already exists`)
            }
        }
        return this.repository.createSession(data)
    }

    async getSessionById(id: string) {
        const session = await this.repository.findById(id)
        if(!session) {
            throw new Error('Session not found')
        }
        return session
    }
    async getSessionByCode(code: string) {
        const session = await this.repository.findByCode(code)
        if(!session) {
            throw new Error('Session not found')
        }
        return session
    }
    async listSessions(filters: GroupSessionFilters) {
        return this.repository.findAll(filters)
    }
    async updateSession(id: string, data: UpdateGroupSessionDTO) {
        const session = await this.repository.findById(id)
        if(!session) {
            throw new Error('Session not found')
        }
        if(session.status !== 'forming') {
            throw new Error('Only session in forming status can be updated')
        }
        if(data.endTime && data.endTime <= new Date()) {
            throw new Error('End time must be in the future')
        }
        if(data.groupPrice !== undefined && data.groupPrice <= 0) {
            throw new Error('Group price must be greater than 0')
        }
        if(data.targetMoq !== undefined && data.targetMoq < 2) {
            throw new Error('Minimum order quantity (moq) must be at least 2')
        }
        return this.repository.updateSession(id,data)
    }
    async joinSession(data: JoinGroupDTO) {
        const session = await this.repository.findById(data.groupSessionId)
        if(!session) {
            throw new Error('Session not found')
        }
        if(session.status !== 'forming' && session.status !== 'active') {
            throw new Error('Cannot join this session. Session is no longer accepting participants')
        }
        if(session.end_time <= new Date()) {
            throw new Error('Session has expired')
        }

        const hasJoined = await this.repository.hasUserJoined(session.id, data.userId)
        if(hasJoined){
            throw new Error('User has already joined this session')
        }
        if(data.quantity < 1) {
            throw new Error('Quantity must be at least 1')
        }

        const calculatedTotal = data.quantity * data.unitPrice
        if(data.totalPrice !== calculatedTotal) {
            throw new Error(`Total price must be ${calculatedTotal} for quantity ${data.quantity}`)
        }

        const participant = await this.repository.joinSession(data)

          // TODO: Integrate with payment-service
  // await paymentService.charge({
  //   userId: data.userId,
  //   amount: data.totalPrice,
  //   type: 'group_session_join',
  //   referenceId: participant.id
  // });

        await this.checkMoqReached(session.id)

        return participant
    }
    async leaveSession(sessionId: string, userId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'moq_reached' || session.status === 'success') {
      throw new Error('Cannot leave confirmed sessions');
    }

    const result = await this.repository.leaveSession(sessionId, userId);
    
    if (result.count === 0) {
      throw new Error('User is not a participant or has already been converted to an order');
    }

    return { message: 'Successfully left the session' };
  }

  async getParticipants(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return this.repository.getSessionParticipants(sessionId);
  }

  async getSessionStats(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const stats = await this.repository.getParticipantStats(sessionId);
    
    return {
      ...stats,
      targetMoq: session.target_moq,
      progress: (stats.participantCount / session.target_moq) * 100,
      moqReached: stats.participantCount >= session.target_moq,
      timeRemaining: this.calculateTimeRemaining(session.end_time),
      status: session.status
    };
  }

  async startProduction(sessionId: string, factoryOwnerId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.factories.owner_id !== factoryOwnerId) {
      throw new Error('Only factory owner can start production');
    }

    if (session.status !== 'moq_reached') {
      throw new Error('Can only start production for confirmed sessions');
    }

    if (session.production_started_at) {
      throw new Error('Production already started');
    }

    await this.repository.startProduction(sessionId);

      // TODO: Notify all participants
  // await notificationService.sendBulk({
  //   type: 'PRODUCTION_STARTED',
  //   recipients: session.group_participants.map(p => p.user_id),
  //   data: {
  //     sessionCode: session.session_code,
  //     productName: session.products.product_name,
  //     factoryName: session.factories.factory_name,
  //     estimatedCompletion: session.estimated_completion_date
  //   },
  //   channels: ['email', 'push']
  // });

    return { message: 'Production started successfully' };
  }

  async completeProduction(sessionId: string, factoryOwnerId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.factories.owner_id !== factoryOwnerId) {
      throw new Error('Only factory owner can complete production');
    }

    if (!session.production_started_at) {
      throw new Error('Production has not been started');
    }

    if (session.production_completed_at) {
      throw new Error('Production already completed');
    }

    await this.repository.markSuccess(sessionId);
      // TODO: Notify participants - ready for shipping
  // await notificationService.sendBulk({
  //   type: 'PRODUCTION_COMPLETED',
  //   recipients: session.group_participants.map(p => p.user_id),
  //   data: {
  //     sessionCode: session.session_code,
  //     productName: session.products.product_name,
  //     nextStep: 'Preparing for shipment'
  //   },
  //   channels: ['email', 'push']
  // });
  
  // TODO: Trigger logistics - create pickup tasks
  // await logisticsService.createPickupTask({
  //   sessionId: sessionId,
  //   factoryId: session.factory_id,
  //   orderIds: session.group_participants.map(p => p.order_id)
  // });

    return { message: 'Production completed successfully' };
  }

  async cancelSession(sessionId: string, reason?: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'success' || session.status === 'moq_reached') {
      throw new Error('Cannot cancel confirmed or completed sessions');
    }

    await this.repository.updateStatus(sessionId, 'cancelled');

    return { message: 'Session cancelled successfully', reason };
  }

  async checkMoqReached(sessionId: string) {
    const session = await this.repository.findById(sessionId);
    if (!session) {
      return;
    }

    if (session.status !== 'forming' && session.status !== 'active') {
      return;
    }

    const stats = await this.repository.getParticipantStats(sessionId);
    
    if (stats.participantCount >= session.target_moq && !session.moq_reached_at) {
      await this.repository.markMoqReached(sessionId);

          // TODO: Notify factory owner
    // await notificationService.send({
    //   type: 'MOQ_REACHED',
    //   recipientId: session.factories.owner_id,
    //   data: {
    //     sessionCode: session.session_code,
    //     productName: session.products.product_name,
    //     participantCount: stats.participantCount,
    //     totalRevenue: stats.totalRevenue,
    //     action: 'Start production in your dashboard'
    //   },
    //   channels: ['email', 'push', 'sms']
    // });
    
    // TODO: Notify all participants
    // await notificationService.sendBulk({
    //   type: 'GROUP_CONFIRMED',
    //   recipients: session.group_participants.map(p => p.user_id),
    //   data: {
    //     sessionCode: session.session_code,
    //     productName: session.products.product_name,
    //     estimatedCompletion: session.estimated_completion_date
    //   },
    //   channels: ['email', 'push']
    // });
    }
  }

  async processExpiredSessions() {
    const expiredSessions = await this.repository.findExpiredSessions();
    const results: Array<
      | { sessionId: string; sessionCode: string; action: 'confirmed'; participants: number }
      | { sessionId: string; sessionCode: string; action: 'failed'; participants: number; targetMoq: number }
    > = [];

    for (const session of expiredSessions) {
      const stats = await this.repository.getParticipantStats(session.id);
      
      if (stats.participantCount >= session.target_moq) {
        await this.repository.markMoqReached(session.id);

          // TODO: Create orders and calculate shipping
  // await orderService.createFromSession(session.id);
  // await shippingService.calculateAndCharge(session.id);

        results.push({
          sessionId: session.id,
          sessionCode: session.session_code,
          action: 'confirmed',
          participants: stats.participantCount
        });
      } else {
        await this.repository.markFailed(session.id);

              
      // TODO: Notify participants - session failed
      // await notificationService.sendBulk({
      //   type: 'GROUP_FAILED',
      //   recipients: session.group_participants.map(p => p.user_id),
      //   data: {
      //     sessionCode: session.session_code,
      //     productName: session.products.product_name,
      //     participantCount: stats.participantCount,
      //     targetMoq: session.target_moq,
      //     refundAmount: 'Processing refund'
      //   },
      //   channels: ['email', 'push']
      // });
      
      // TODO: Notify factory - session didn't reach MOQ
      // await notificationService.send({
      //   type: 'SESSION_FAILED',
      //   recipientId: session.factories.owner_id,
      //   data: {
      //     sessionCode: session.session_code,
      //     productName: session.products.product_name,
      //     participantCount: stats.participantCount,
      //     targetMoq: session.target_moq
      //   },
      //   channels: ['email']
      // });
      
      // TODO: Trigger refunds
      // await paymentService.refundSession({
      //   sessionId: session.id,
      //   participants: session.group_participants
      // });
        results.push({
          sessionId: session.id,
          sessionCode: session.session_code,
          action: 'failed',
          participants: stats.participantCount,
          targetMoq: session.target_moq
        });
      }
    }

    return results;
  }

  private calculateTimeRemaining(endTime: Date): {
    hours: number;
    minutes: number;
    expired: boolean;
  } {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { hours: 0, minutes: 0, expired: true };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, expired: false };
  }

  async deleteSession(id: string) {
    const session = await this.repository.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'moq_reached' || session.status === 'success') {
      throw new Error('Cannot delete confirmed or completed sessions');
    }

    const participantCount = await this.repository.getParticipantCount(id);
    if (participantCount > 0) {
      throw new Error('Cannot delete session with participants. Cancel it instead');
    }

    return this.repository.deleteSession(id);
  }

}