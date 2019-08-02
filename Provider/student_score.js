const axios = require('axios');
const { createHash } = require('crypto');
const { fromBase64, encode } = require('base64url');
const { passPhrase } = require('../Provider/keyGenerator');

/*
* Check if Platform allows scores to be sent, if it does, request Authorization Code
* @param payload - decoded Launch Request
* @returns boolean of whether sending scores is in scope or not
*/
function prep_send_score(req) {
  if (req.session.decoded_launch.hasOwnProperty('https://purl.imsglobal.org/spec/lti-ags/claim/endpoint') &&
  req.session.decoded_launch["https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"].scope.includes('https://purl.imsglobal.org/spec/lti-ags/scope/score')) {
    return code_request(req, 'https://purl.imsglobal.org/spec/lti-ags/scope/score');
  } else {
    return false;
  }
}

/*
* Creates appropriate payload to request Authorization code for provided scope
* @param req - original Request
* @param scope - scope requested
* @return - endpoint with parameters
*/
function code_request(req, scope) {
  const code_verifier = passPhrase();
  req.session.code_verifier = code_verifier;
  
  const payload = {
    response_type: 'code',
    client_id: req.session.platform_DBinfo.consumerToolClientID,
    redirect_uri: 'https://piedpiper.localtunnel.me/auth_code',
    scope: scope,
    state: passPhrase(),
    code_challenge: generate_challenge(code_verifier), 
    code_challenge_method: 'S256'
  };
  return req.session.platform_DBinfo.consumerAuthorizationURL + '?' + Object.keys(payload).map(key => key + '=' + payload[key]).join('&');
}

/*
* Create BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
* @param code_verifier - random string to endcode
* @returns encoded challenge
*/
function generate_challenge(code_verifier) {
  const hash = createHash('sha256')
      .update(code_verifier)
      .digest('base64');
  return fromBase64(hash);
}

/*
* Send score to Platform. Must get appropriate access token and then send score
* @param req 
* @param score - final score for student's work
* @param scoreMax - maximum score allowed for work
*/
function send_score(req, score, scoreMax) {
  //Request the access token
  const payload = {
    grant_type: 'authorization_code',
    code:  req.params.code,
    client_id:  req.session.platform_DBinfo.consumerToolClientID,
    redirect_uri: 'https://piedpiper.localtunnel.me/auth_code',
    scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/score',
    code_verifier: req.session.code_verifier
  }
  const base64_user_pass = encode(req.session.platform_DBinfo.kid[0].keyID + ':' + req.session.platform_DBinfo.kid[0].privateKey, 'base64');
  
  axios.post(req.session.platform_DBinfo.consumerAccessTokenURL, payload, 
    { headers: {
      'Authorization': 'Basic ' + base64_user_pass,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
  .then(result => {
    //With access token, send score to Platform
    const score_message = {
      "userId":  req.session.payload.sub,
      "scoreGiven": score,
      "scoreMaximum": scoreMax,
      "timestamp": new Date(Date.now()).toJSON(),
      "activityProgress": "Completed",
      "gradingProgress": "FullyGraded"
    }; 
    axios.post(req.session.payload["https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"].lineitem + "/scores", 
      score_message, 
      { headers: {
        'Authorization': result.token_type + ' ' + result.access_token,
        'Content-Type': 'application/vnd.ims.lis.v1.score+json'
    }})
    .then(success => console.log(success))  //successfully posted grade
    .catch(err => console.log(err));   //error posting grade
  })
  .catch(err => console.log(err)); //error getting token
}

module.exports = { prep_send_score, send_score };
