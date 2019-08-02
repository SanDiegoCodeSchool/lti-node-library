const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');

/*
 * Validate LTI 1.3 Launch Request
 * @param req - HTTP Tool launch request to be validated
 * @returns an array, which if empty indicates 0 errors, otherwise, contains description of each error 
 */
function valid_launch_request(body, req) {
  let errors = [];

  // Per the LTI1.3 spec, the following are the minimum valid roles
  const VALID_ROLES = [
    "http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator",
    "http://purl.imsglobal.org/vocab/lis/v2/system/person#None",
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator",
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Faculty",
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Guest",
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#None",
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Other",
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Staff",
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Mentor"
  ];

  const VALID_CONTEXTS = [
    'http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering',
    'CourseOffering',                                                     // deprecated
    'urn:lti:context-type:ims/lis/CourseOffering',                        // decrecated
    'http://purl.imsglobal.org/vocab/lis/v2/course#CourseSection',
    'CourseSection',                                                      // deprecated
    'urn:lti:context-type:ims/lis/CourseSection',                         // deprecated
    'http://purl.imsglobal.org/vocab/lis/v2/course#CourseTemplate',
    'CourseTemplate',                                                     // deprecated 
    'urn:lti:context-type:ims/lis/CourseTemplate',                        // deprecated
    'http://purl.imsglobal.org/vocab/lis/v2/course#Group',
    'Group',                                                              // deprecated
    'urn:lti:context-type:ims/lis/Group'                                  // deprecated
  ];

  // Check it is a POST request
  if (req.method !== "POST") {
    errors.push("Method invalid");
  }

  // Check the LTI message type is LtiResourceLinkRequest
  if (body.hasOwnProperty("https://purl.imsglobal.org/spec/lti/claim/message_type")) {
    if (body["https://purl.imsglobal.org/spec/lti/claim/message_type"] !== "LtiResourceLinkRequest") {
      errors.push("LTI message type invalid");
    }
  } else {
    errors.push("LTI message type missing");
  }

  // Check the LTI version is 1.3.0
  if (body.hasOwnProperty("https://purl.imsglobal.org/spec/lti/claim/version")) {
    if (body["https://purl.imsglobal.org/spec/lti/claim/version"] !== "1.3.0") {
      errors.push("LTI Version invalid");
    }
  } else {
    errors.push("LTI Version missing");
  }

  //Check the Issuer is same as issuer in Login Request
  if (body.hasOwnProperty('iss')) {
    if (body.iss !== req.session.login_request.iss) {
      errors.push("Issuer invalid", body.iss, req.session.login_request.iss);
    }
  } else {
    errors.push("Issuer missing");
  }

  //Check the Audience matches Tool's Client ID.  Note Audience can be an array or a single string
  //If multiple Audiences are present, must all check that the Authorized Party is present and valid.
  if (body.hasOwnProperty('aud')) {
    if (typeof body.aud === 'array' && !body.aud.includes(req.session.platform_DBinfo.consumerToolClientID &&
      body.hasOwnProperty('azp') && !body.azp !== req.session.platform_DBinfo.consumerToolClientID) ||
      body.aud !== req.session.platform_DBinfo.consumerToolClientID) {
      errors.push("Audience invalid", body.aud);
    }
  } else {
    errors.push("Audience missing");
  }

  //If present, check the security Algorithm is RS256
  if (body.hasOwnProperty('alg')) {
    if (body.alg !== 'RS256') {
      errors.push("Algorithm invalid", body.alg);
    }
  }

  //Check that the Token has not passed its Expiration time
  if (body.hasOwnProperty('exp')) {
    if (Date.now()/1000 >= body.exp) {
      errors.push("Expiration invalid", Date.now(), body.exp);
    }
  } else {
    errors.push("Expiration missing");
  }

  //Check that the Token's Issued At time is within the past 1 hour (3600 seconds)
  if (body.hasOwnProperty('iat')) {
    if (Date.now()/1000 - 3600 >= body.iat) {
      errors.push("Issued At invalid", Date.now(), body.iat);
    }
  } else {
    errors.push("Issued At missing");
  }

  //Check that the Nonce is valid to mitigate replay attacks. The nonce value is a case-sensitive string and cannot be 
  //used more than once within a Tool-specified time frame.
  //TODO:  implement cleanup function to remove old nonce values (to allow nonces to be reused after a certain timeframe).
  if (body.hasOwnProperty('nonce')) {
    if (!req.session.hasOwnProperty('nonce_list')) {
      req.session.nonce_list = [body.nonce];
    } else if (req.session.nonce_list.includes(body.nonce)) {
      errors.push("Nonce invalid: duplicated");
    } else {
      req.session.nonce_list.push(body.nonce);
    }
  } else {
    errors.push("Nonce missing");
  }

  // Check the Deployment ID.  deployment_id is a stable unique id within the iss (Issuer) & client_id (Tool).
  // TODO:  check actual value against database once registration data is being stored
  if (body.hasOwnProperty("https://purl.imsglobal.org/spec/lti/claim/deployment_id")) {
    if (body["https://purl.imsglobal.org/spec/lti/claim/deployment_id"].length > 255) {
      errors.push("Deployment ID invalid");
    }
  } else {
    errors.push("Deployment ID missing");
  }

  // Check Target Link URI - MUST be the same value as the target_link_uri passed by the platform in the OIDC third party 
  // initiated login request, which was stored for this session.
  if (body.hasOwnProperty('https://purl.imsglobal.org/spec/lti/claim/target_link_uri')) {
    if (body['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'] === "") {
      errors.push("Target Link URI invalid");
    } else if (body['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'] !== req.session.login_request.target_link_uri) {
      errors.push("Target Link URI invalid");
    }
  } else {
    errors.push("Target Link URI missing");
  }

  // Check a resource link ID exists
  // TODO:  check actual value against database once registration data is being stored
  if (body.hasOwnProperty("https://purl.imsglobal.org/spec/lti/claim/resource_link") &&
    body["https://purl.imsglobal.org/spec/lti/claim/resource_link"].hasOwnProperty("id")) {
    if (body["https://purl.imsglobal.org/spec/lti/claim/resource_link"].id.length > 255) {
      errors.push("Resource Link invalid");
    }
  } else {
    errors.push("Resource Link missing");
  }

  // Check sub exists for OIDC request.  Anonymous requests are not currently supported.
  // TODO: check actual value against database once user data is being stored
  if (body.hasOwnProperty('sub')) {
    if (body['sub'].length > 255) {
      errors.push('Sub invalid', body['sub']);
    }
  } else {
    errors.push("Sub missing");
  }

  // Check any user roles provided are valid, ok if array is empty, but if non-empty, must contain
  // at least one of the VALID_ROLES defined in this function
  if (body.hasOwnProperty("https://purl.imsglobal.org/spec/lti/claim/roles")) {
    if (body["https://purl.imsglobal.org/spec/lti/claim/roles"].length !== 0 &&
      !body["https://purl.imsglobal.org/spec/lti/claim/roles"].some(
        role => VALID_ROLES.indexOf(role) >= 0)) {
      errors.push("Role invalid");
    }
  } else {
    errors.push("Role missing");
  }

  // Context is optional, but if present, check validity of those provided.
  if (body.hasOwnProperty('https://purl.imsglobal.org/spec/lti/claim/context')) {
    if (!body['https://purl.imsglobal.org/spec/lti/claim/context'].hasOwnProperty('label') &&
      !body['https://purl.imsglobal.org/spec/lti/claim/context'].hasOwnProperty('title') ) {
        errors.push('Context invalid: does not contain label OR title');
    }
    if (body['https://purl.imsglobal.org/spec/lti/claim/context'].hasOwnProperty('type')) {
      if (!body['https://purl.imsglobal.org/spec/lti/claim/context'].type.some(
          context => VALID_CONTEXTS.indexOf(context) >= 0)) {
        errors.push('Context invalid: type invalid', body['https://purl.imsglobal.org/spec/lti/claim/context'].type);
      }
    } else {
      errors.push('Context type missing');
    }
  }    

  // User name information is optional, but if present, check validity of what is provided.
  if (body.hasOwnProperty('given_name') && typeof body['given_name'] !== 'string') {
    errors.push('Name information invalid');
  }
  if (body.hasOwnProperty('family_name') && typeof body['family_name'] !== 'string') {
    errors.push('Name information invalid');
  }
  if (body.hasOwnProperty('name') && typeof body['name'] !== 'string') {
    errors.push('Name information invalid');
  }

  // Returning scores is optional, but if requested, check validity of what is provided.
  if (body.hasOwnProperty('https://purl.imsglobal.org/spec/lti-ags/claim/endpoint')) {
    if (!body['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].hasOwnProperty('scope') || 
      body['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].scope.length === 0) {
        errors.push('Score setup invalid');
    }
    if (!body['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].hasOwnProperty('lineitem') ||
      typeof body['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].lineitem !== 'string') {
        errors.push('Score setup invalid');
    }
  }

  return errors;
}

/*
* Validate that the state sent with an OIDC launch matches the state that was sent in the OIDC response
* @param req - HTTP OIDC request to launch Tool.
* @returns - boolean on whether it is valid or not
*/
function is_valid_oidc_launch(req) {
  //TODO: when state is signed before being sent, need to decode before validation
  if (req.body.state !== req.session.login_response.state) {
    return false;
  }
  return true;
}

/*
* Validates that the required keys are present and filled per LTI 1.3 standards in conjunction with the OAuth_validation
* before launching Tool.
* @param req Request 
* @param res Response
* @param path - if any path needs to be appended to the URI to launch the Tool to the correct route
* @returns object with errors if invalid launch, otherwise, redirects to Tool
*/
function launchTool(req, res, path) {
  let errors = [];

  //If Platform rejected login response, show error
  if (req.body.hasOwnProperty('error')) {
    errors.push(`Login Response was rejected: ${req.body.error}`);
  } else {
    //Validate OIDC Launch Request
    if (!is_valid_oidc_launch(req)) {
      errors.push('Invalid OIDC Launch Request: state mismatch'); 
    } else {
      //If valid, save OIDC Launch Request for later reference during current session
      req.session.payload = req.body;
  
      //Decode the JWT into header, payload, and signature
      const jwt_string = req.body.id_token; 
      let basic_decoded = jwt.decode(jwt_string, {complete: true});

      //Get the key to verify the JWT
      axios.get(req.session.platform_DBinfo.consumerAuthorizationconfig.key + '?kid=' + basic_decoded.header.kid)
      .then(keys => {
        jwt.verify(jwt_string, jwkToPem(keys.data.keys[0]), {algorithm: 'RS256'}, (err, decoded) => {
          if (err) {
            errors.push(`Could not verify token: ${err}`);
          } else {
            //Save decoded OIDC Launch Request to reference later during the current session
            req.session.decoded_launch = decoded;

            //Validate Launch Request details
            errors = valid_launch_request(decoded, req);

            if (errors.length === 0) {
              //No errors, so redirect to the Tool
              return res.send({ payload: req.session.payload } && res.redirect(decoded['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'] + path));
            }
          }
        });
      });
    }
  }
  if (errors.length > 0) {
    return res.status(400).send({
      error: "invalid_request",
      errors: errors
    });
  }
}
      
module.exports = { launchTool, valid_launch_request };
