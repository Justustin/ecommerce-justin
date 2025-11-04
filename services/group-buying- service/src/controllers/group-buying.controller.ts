import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { GroupBuyingService } from '../services/group.buying.service';

export class GroupBuyingController {
  private service: GroupBuyingService;

  constructor() {
    this.service = new GroupBuyingService();
  }

  createSession = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const session = await this.service.createSession(req.body);
      res.status(201).json({
        message: 'Group buying session created successfully',
        data: session
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getSessionById = async (req: Request, res: Response) => {
    try {
      const session = await this.service.getSessionById(req.params.id);
      res.json({ data: session });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  getSessionByCode = async (req: Request, res: Response) => {
    try {
      const session = await this.service.getSessionByCode(req.params.code);
      res.json({ data: session });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  listSessions = async (req: Request, res: Response) => {
    try {
      const filters = {
        status: req.query.status as any,
        factoryId: req.query.factoryId as string,
        productId: req.query.productId as string,
        activeOnly: req.query.activeOnly === 'true',
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };

      const result = await this.service.listSessions(filters);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  updateSession = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const session = await this.service.updateSession(req.params.id, req.body);
      res.json({
        message: 'Session updated successfully',
        data: session
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  joinSession = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const participant = await this.service.joinSession({
        ...req.body,
        groupSessionId: req.params.id
      });

      res.status(201).json({
        message: 'Successfully joined the session',
        data: participant
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  leaveSession = async (req: Request, res: Response) => {
    try {
      const result = await this.service.leaveSession(
        req.params.id,
        req.body.userId
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getParticipants = async (req: Request, res: Response) => {
    try {
      const participants = await this.service.getParticipants(req.params.id);
      res.json({ data: participants });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  getSessionStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.service.getSessionStats(req.params.id);
      res.json({ data: stats });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  startProduction = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await this.service.startProduction(
        req.params.id,
        req.body.factoryOwnerId
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  completeProduction = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await this.service.completeProduction(
        req.params.id,
        req.body.factoryOwnerId
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  cancelSession = async (req: Request, res: Response) => {
    try {
      const result = await this.service.cancelSession(
        req.params.id,
        req.body.reason
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  processExpired = async (req: Request, res: Response) => {
    try {
      const results = await this.service.processExpiredSessions();
      res.json({
        message: 'Expired sessions processed',
        data: results
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  // TESTING: Manually expire a session and process it
  manualExpire = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.service.manuallyExpireAndProcess(id);
      res.json({
        message: 'Session manually expired and processed',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  deleteSession = async (req: Request, res: Response) => {
    try {
      await this.service.deleteSession(req.params.id);
      res.json({ message: 'Session deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}