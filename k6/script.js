import http from "k6/http";
import { sleep, check, group } from "k6";
import { Rate, Trend } from "k6/metrics";

//
// Configure Page URL and Credentials
//
// Either enter the FQDN/IP address of your external load balancer, or the FQDN/IP address of one of the web servers
// Also, supply one of the bank customer's credentials
const woodgroveBankUrl = "http://52.247.31.234/";
const username = "dmelamed3244";
const password = "(Pass@word)1234!";

//
// Setup custom metrics
// Trends calculate different statistics over multiple requests on the added values (min, max, average, or percentiles)
// Rates represent customer metrics for keeping track of the percentage of added values that are non-zero
//
const testWoodgroveHomePageDurationTrend = new Trend("Test Woodgrove Home Page Duration");
const testWoodgroveHomePageErrorRate = new Rate("Test Woodgrove Home Page Errors");
const testWoodgroveLoginDurationTrend = new Trend("Test Woodgrove Login Duration");
const testWoodgroveLoginErrorRate = new Rate("Test Woodgrove Login Errors");

//
// Options for the performance test run
//
export const options = {
  //
  // Stages allow you to specify ramp up/down patters for your tests.
  // In the below pattern, requests ramp up to 30 VUs (virtual users) in 3 stages over 3 minutes.
  // Then, the requests ramp back down to 0 VUs in 2 stages over 2 minutes.
  //
  stages: [
    { duration: "1m", target: 100 },
    { duration: "1m", target: 250 },
    { duration: "1m", target: 500 },
    { duration: "1m", target: 0 },
  ],

  //
  // Define "allowable" thresholds
  // In the below example...
  //    - the total duration of the http request should not exceed 10 seconds (e.g. max<10000)
  //    - under 90% of the targeted load (30 VUs * .9 = 27 VUs), the http request duration should be under 2 seconds (e.g. p(90)<2000)
  //    - under 95% of the targeted load (30 VUs * .95 = 29 VUs), the http request duration should be under 5 seconds (e.g. p(95)<5000), understanding that more load may have some adverse impact on performance
  //    - of all requests, less than 10% should fail
  //
  thresholds: {
    http_req_duration: ["max<10000", "p(90)<2000", "p(95)<5000"],
    http_req_failed: ["rate<0.1"],
  },
};

//
// Example of testing the loading of a static page or asset (e.g. css, javascript, image, etc.)
//
function testHomePage() {
  const start = new Date();

  const response = http.get(woodgroveBankUrl);

  const end = new Date();

  // Capture the time it took to load the entire page
  testWoodgroveHomePageDurationTrend.add(end - start);

  // Make sure that the request returned successfully (e.g. HTTP status of 200). If not, add to the error count.
  check(response, {
    "testWoodgrovePage: status is 200": (r) => r.status === 200,
  }) || testWoodgroveHomePageErrorRate.add(1);
}

//
// Example of performance testing the process of logging into the application
//
function testLogin() {
  let response = http.get(woodgroveBankUrl + "/Login");

  const start = new Date();

  // Now, submit form setting/overriding some fields of the form
  response = response.submitForm({
    formSelector: "form",
    fields: { Username: username, Password: password },
  });

  const end = new Date();

  // Capture the time it took to login and load the page
  testWoodgroveLoginDurationTrend.add(end - start);

  check(response, {
    "testWoodgroveLogin: status is 200": (r) => r.status === 200,
  }) || testWoodgroveLoginErrorRate.add(1);
}

//
// This is the main entry point for tests
//
export default function () {
  testHomePage();
  testLogin();

  // wait 1 second before another request in order to simulate clicks of a real user (and not create false positives for DDoS)
  sleep(1);
}
