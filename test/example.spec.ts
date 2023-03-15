import { execSync } from "node:child_process";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("Transactions routes", () => {
  beforeAll(async () => await app.ready());

  afterAll(async () => await app.close());

  beforeEach(() => {
    execSync("npm run knex migrate:rollback --all");
    execSync("npm run knex migrate:latest");
  });

  it("should be able to create new transaction", async () => {
    const response = await request(app.server).post("/transactions").send({
      title: "New transaction",
      type: "credit",
      amount: 5000,
    });

    expect(response.statusCode).toEqual(201);
  });

  it("should be able to list all transactions", async () => {
    const createTransactionResponse = await request(app.server)
      .post("/transactions")
      .send({
        title: "New transaction",
        type: "credit",
        amount: 5000,
      });

    const cookies = createTransactionResponse.get("Set-Cookie");

    const listTransactionResponse = await request(app.server)
      .get("/transactions")
      .set("Cookie", cookies)
      .expect(200);

    expect(listTransactionResponse.body.transactions).toEqual([
      expect.objectContaining({
        title: "New transaction",
        amount: 5000,
      }),
    ]);
  });

  it("should be able to get specific transaction", async () => {
    const createTransactionResponse = await request(app.server)
      .post("/transactions")
      .send({
        title: "New transaction",
        type: "credit",
        amount: 5000,
      });

    const cookies = createTransactionResponse.get("Set-Cookie");

    const listTransactionResponse = await request(app.server)
      .get("/transactions")
      .set("Cookie", cookies);

    const transactionId = listTransactionResponse.body.transactions[0].id;

    const specificTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set("Cookie", cookies)
      .expect(200);

    expect(specificTransactionResponse.body).toEqual(
      expect.objectContaining({
        title: "New transaction",
        amount: 5000,
      })
    );
  });

  it("should be able to get the summary", async () => {
    const createTransactionResponse = await request(app.server)
      .post("/transactions")
      .send({
        title: "New transaction",
        type: "credit",
        amount: 5000,
      });

    const cookies = createTransactionResponse.get("Set-Cookie");

    await request(app.server).post("/transactions").set("Cookie", cookies).send({
      title: "New transaction",
      type: "debit",
      amount: 3000,
    });

    const transactionSummaryResponse = await request(app.server)
      .get(`/transactions/summary`)
      .set("Cookie", cookies)
      .expect(200);

    expect(transactionSummaryResponse.body.summary).toEqual(
      expect.objectContaining({
        total: 2000,
      })
    );
  });
});
