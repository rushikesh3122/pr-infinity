import type { Request, Response } from 'express';
import * as leads from '../services/lead.service.js';
import { createLeadSchema, listLeadsQuery, updateLeadSchema, updateLeadStatusSchema } from '../validators/lead.validator.js';
import { objectId } from '../validators/common.js';
import { ok } from '../utils/respond.js';

const idParam = (req: Request) => objectId.parse(req.params.id);

export async function create(req: Request, res: Response) {
  ok(res, await leads.createLead(createLeadSchema.parse(req.body)), 201);
}

export async function list(req: Request, res: Response) {
  const { items, ...meta } = await leads.listLeads(listLeadsQuery.parse(req.query));
  ok(res, items, 200, meta);
}

export async function get(req: Request, res: Response) {
  ok(res, await leads.getLead(idParam(req)));
}

export async function update(req: Request, res: Response) {
  ok(res, await leads.updateLead(idParam(req), updateLeadSchema.parse(req.body)));
}

export async function updateStatus(req: Request, res: Response) {
  const { status } = updateLeadStatusSchema.parse(req.body);
  ok(res, await leads.updateLeadStatus(idParam(req), status));
}

export async function remove(req: Request, res: Response) {
  ok(res, await leads.deleteLead(idParam(req)));
}
