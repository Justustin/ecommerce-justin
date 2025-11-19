import request from 'supertest';
import app from '../../../src/index';

export class APIClient {
  async get(path: string, headers: any = {}) {
    return request(app)
      .get(path)
      .set(headers);
  }

  async post(path: string, body: any, headers: any = {}) {
    return request(app)
      .post(path)
      .send(body)
      .set(headers);
  }

  async put(path: string, body: any, headers: any = {}) {
    return request(app)
      .put(path)
      .send(body)
      .set(headers);
  }

  async delete(path: string, headers: any = {}) {
    return request(app)
      .delete(path)
      .set(headers);
  }
}

export const api = new APIClient();
