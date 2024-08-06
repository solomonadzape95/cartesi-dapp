// XXX even though ethers is not used in the code below, it's very likely
// it will be used by any DApp, so we are already including it here
const { ethers } = require("ethers");

function hexToStr(hex){
  return ethers.toUtf8String(hex);
}
function strToHex(payload){
  return ethers.hexlify(ethers.toUtf8Bytes(payload))
}
function isNum(num){
  return !isNaN(num)
}
function genPassWord(characterSet, len) {
  let password = "";
  const randomBytes = new Uint8Array(len);
  window.crypto.getRandomValues(randomBytes);
  for (let i = 0; i < len; i++) {
    let randomIndex = randomBytes[i] % characterSet.length;
    password += characterSet[randomIndex];
  }
  return password;
}
let users = []
let total = 0
const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

async function handle_advance(data) {
  console.log("Received advance request data " + JSON.stringify(data));

  const metadata = data['metadata']
  const payload = data['payload']

 const bg = payload.len <= 6 ? "#D1364E" : payload.len > 8 ? "#1c815a" : "#BE4E3A";
  let characterSet = "0123456789";
  characterSet = payload.letters
    ? characterSet + "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    : characterSet;
  characterSet = payload.syms ? characterSet + "!@#$%^&*_-/+=" : characterSet;
  let pwd = genPassWord(characterSet)
  const reports_req = await fetch(rollup_server + "/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: strToHex({password:pwd,bg:bg}) }),
    });
  return "accept";
}

async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));
  let res;
  let payload = data['payload']
  let route = hexToStr(payload)
  const report_req = await fetch(rollup_server + "/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: strToHex('The sentence should be on hex format') }),
    });
  return "accept";
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();
