const jwt = require('jsonwebtoken');
const { valid_oauth2_request } = require("../Provider/oauth2_validation");

/* 
* Creates a JSON web token in accordance with the LTI 1.3 standard and in conjunction with Oauth 2.0 validation. 
* @param errors - errors array from validation
* @param res - Result to send
* @returns result with JWT, if successful, or an object with errors listed
*/
function tokenMaker(req, res) {
  let errors = valid_oauth2_request(req);

  if (errors.length === 0) {
    // no errors
    res.setHeader("Content-Type", "application/json;charset=UTF-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    const payload = {
      sub: req.body.client_id,
      expires_in: 3600, // 1 hour per IMS spec
      token_type: "bearer",
      scope: ""
    };
    const jwt_payload = jwt.sign(payload, req.body.client_secret, {
      algorithm: "RS256"
    });
    return res.status(200).send({ jwt: jwt_payload });
  } else {
    if (errors.findIndex(e => e.includes("grant type invalid")) >= 0) {
      return res.status(400).send({
        error: "unsupported_grant_type",
        errors: errors
      });
    } else if (errors.findIndex(e => e.includes("invalid")) >= 0) {
      return res.status(401).send({
        error: "invalid_client",
        errors: errors
      });
    } else {
      return res.status(400).send({
        error: "invalid_request",
        errors: errors
      });
    }
  }
}

module.exports = { tokenMaker };
