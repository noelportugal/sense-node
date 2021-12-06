"use strict";
const axios = require("axios");
const moment = require("moment");
const ws = require("ws");

class Sense {
  /**
   * @param {object} options
   * @constructor
   */
  constructor(options) {
    this.baseUrl = "https://api.sense.com/apiservice/api/v1";
    this.wsUrl = "wss://clientrt.sense.com/monitors";
    this.email = options.email;
    this.password = Buffer.from(options.password.toString("base64"));
    this.verbose = options.verbose || false;
    this.auth = {};
    this.senseWS = null;
  }

  /**
   * realtimeFeed
   * @returns {data}
   */
  realtimeFeed() {
    let senseWS = null;
    let sampleSize = 5;
    let counter = 0;
    let currentSample = [];

    return new Promise((resolve, reject) => {
      try {
        const WSURL = `${this.wsUrl}/${this.auth.monitors[0].id}/realtimefeed?access_token=${this.auth.access_token}`;
        senseWS = new ws(WSURL);

        senseWS.on("open", () => {
          this.verbose && console.log("Connected");
        });

        senseWS.on("message", (data) => {
          const response = JSON.parse(data);
          const current = response.payload.d_w;
          if (counter < sampleSize) {
            if (current) {
              counter++;
              currentSample.push(current);
              this.verbose && console.log(JSON.stringify(currentSample));
            }
          } else {
            senseWS.close();
          }
        });

        senseWS.onclose = (data) => {
          this.verbose && console.log("Connection closed");
          resolve(currentSample);
        };
        senseWS.onerror = (data) => {
          this.verbose && console.log("Error: " + data);
          reject(0);
        };
      } catch (error) {
        this.verbose && console.error(`Websocket error: ${error.message}`);
        reject(err);
      }
    });
  }

  /**
   * authenticate
   * @returns {bool}
   */
  async authenticate() {
    let success;
    try {
      const params = new URLSearchParams();
      params.append("email", encodeURI(this.email));
      params.append("password", encodeURI(this.password));

      let options = {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };

      const res = await axios.post(
        `${this.baseUrl}/authenticate`,
        params,
        options
      );
      this.auth = res.data;
      success = true;
    } catch (e) {
      success = false;
    }
    return success;
  }

  /**
   * doSenseCallout
   * @returns {data}
   */
  async doSenseCallout(url) {
    let res;
    try {
      let options = {
        headers: {
          Authorization: `Bearer ${this.auth.access_token}`,
        },
      };
      res = await axios.get(`${this.baseUrl}${url}`, options);
    } catch (e) {
      console.log(e);
    }
    return res;
  }

  /**
   * setReponse
   * @returns {data}
   */
  async getDailyUsage(scale, start) {
    const authenticate = await this.authenticate();
    if (authenticate) {
      const average = (array) => array.reduce((a, b) => a + b) / array.length;
      const currentConsumption = average(await this.realtimeFeed());
      const history = await this.doSenseCallout(
        `/app/history/trends?monitor_id=${
          this.auth.monitors[0].id
        }&scale=${scale}&start=${encodeURI(start)}`
      );

      history.data.currentConsumption = currentConsumption;

      return history.data;
    }
    return null;
  }
}

module.exports = Sense;
