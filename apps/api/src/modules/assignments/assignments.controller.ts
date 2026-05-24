import type { Request, Response, NextFunction } from 'express';
import * as assignmentsService from './assignments.service.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await assignmentsService.assignManager(req.body);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await assignmentsService.listAssignments(req.query as never);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await assignmentsService.getAssignmentById(req.params.id as string);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function unassign(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await assignmentsService.unassignManager(req.params.id as string, req.body.notes);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getRecruitsForManager(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await assignmentsService.getRecruitsForManager(req.params.managerId as string);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getManagersForRecruit(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await assignmentsService.getManagersForRecruit(req.params.recruitId as string);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}
