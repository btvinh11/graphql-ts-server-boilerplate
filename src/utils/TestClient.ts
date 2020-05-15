import * as request from "request-promise";
// tslint:disable-next-line: no-implicit-dependencies
import * as rq from "request";

export class TestClient {
  url: string;
  options: {
    jar: rq.CookieJar;
    withCredentials: boolean;
    json: boolean;
  };

  constructor(url: string) {
    this.url = url;
    this.options = {
      withCredentials: true,
      jar: request.jar(),
      json: true,
    };
  }

  async logout() {
    return request.post(this.url, {
      ...this.options,
      body: {
        query: `
          mutation {
            logout
          }
        `,
      },
    });
  }

  async register(email: string, password: string) {
    return request.post(this.url, {
      ...this.options,
      body: {
        query: `
          mutation {
            register(email: "${email}", password: "${password}") {
              path
              message
            }
        }
        `,
      },
    });
  }

  async me() {
    return request.post(this.url, {
      ...this.options,
      body: {
        query: `
        {
            me {
              id
              email
          }
        }
        `,
      },
    });
  }

  async forgotPasswordChange(newPassword: string, key: string) {
    return request.post(this.url, {
      ...this.options,
      body: {
        query: `
          mutation {
              forgotPasswordChange(newPassword: "${newPassword}", key: "${key}") {
                path
                message
            }
          }
        `,
      },
    });
  }

  async login(email: string, password: string) {
    return request.post(this.url, {
      ...this.options,
      body: {
        query: `
          mutation {
            login(email: "${email}", password: "${password}") {
              path
              message
            }
        }
        `,
      },
    });
  }
}
