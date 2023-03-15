import { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { knex } from "../database";
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";
import { Transactions } from "../types";

export async function transactionsRoutes(app: FastifyInstance) {
  app.get(
    "/",
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, response) => {
      const { sessionId } = request.cookies;

      const transactions = await knex("transactions")
        .select("*")
        .where("session_id", sessionId);

      return response.send({
        transactions,
      });
    }
  );

  app.get(
    "/summary",
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, response) => {
      const { sessionId } = request.cookies;

      const summary = await knex("transactions")
        .sum("amount", {
          as: "total",
        })
        .where("session_id", sessionId)
        .first();

      return response.send({
        summary,
      });
    }
  );

  app.get(
    "/:id",
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, response) => {
      const getTransactionParamsSchema = z.object({
        id: z.string().uuid(),
      });

      const { sessionId } = request.cookies;

      const { id } = getTransactionParamsSchema.parse(request.params);

      const transaction = await knex("transactions")
        .where("id", id)
        .andWhere("session_id", sessionId)
        .first();

      return response.send(transaction);
    }
  );

  app.post("/", async (request, response) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(["credit", "debit"]),
    });

    const body = createTransactionBodySchema.parse(request.body);

    const { title, type, amount } = body;

    let sessionId = request.cookies.sessionId;

    if (!sessionId) {
      sessionId = randomUUID();

      response.cookie("sessionId", sessionId, {
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });
    }

    await knex<Transactions>("transactions").insert({
      id: randomUUID(),
      title,
      amount: type === "credit" ? amount : amount * -1,
      session_id: sessionId,
    });

    return response.status(201).send();
  });
}
