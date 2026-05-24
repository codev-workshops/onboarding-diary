import type { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await usersService.listUsers(req.query as never);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await usersService.getUserById(req.params.id as string);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await usersService.updateProfile(req.params.id as string, req.body);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateRecruitProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await usersService.updateRecruitProfile(req.params.id as string, req.body);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await usersService.updateRole(req.params.id as string, req.body, req.user!.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await usersService.updateStatus(req.params.id as string, req.body, req.user!.id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await usersService.deleteUser(req.params.id as string, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
