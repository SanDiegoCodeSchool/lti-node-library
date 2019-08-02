require('dotenv').config();
const url = require('url');    
const Database = require('../Provider/mongoDB/Database.js');
const { platformSchema } = require('../Provider/register_platform');

/*
* Validates OIDC login request.  Checkes required parameters are present.
* @param req - OIDC login request sent from LMS to Tool
* @returns array of errors, if empty then request is valid
*/
function is_valid_oidc_login(req) {
  let errors = [];
  if (!req.body.hasOwnProperty('iss')) {
    errors.push('Issuer missing');
  }
  if (!req.body.hasOwnProperty('login_hint')) {
    errors.push('Login hint missing');
  }
  if (!req.body.hasOwnProperty('target_link_uri')) {
    errors.push('Target Link URI missing');
  }
  return errors;
}

/* 
* Validate OIDC login and construct response for valid logins.  Looks up Issuer in database to ensure they are registered
* with the Tool.
* @param req - req sent from OIDC to Tool's OIDC login endpoint
* @returns if valid request, returns properly formated response object
* @return if invalid request, returns array of errors with the request
*/

function create_oidc_response(req, res) {
  let errors = [];

  //Save the OIDC Login Request to reference later during current session
  req.session.login_request = req.body;

  Database.Get('platforms', platformSchema, { consumerUrl: req.session.login_request.iss })
  .then(dbResult => {

    if (dbResult.length === 1) return dbResult[0]
    else res.send(['Issuer invalid: not registered']);
  }).then(platform => {
    //Save the Platform information from the database to reference later during current session
    req.session.platform_DBinfo = platform;

    errors = is_valid_oidc_login(req);

    if (errors.length === 0 && req.session.platform_DBinfo) {
      let response = {
        scope: 'openid',
        response_type: 'id_token',
        client_id: req.session.platform_DBinfo.consumerToolClientID,
        redirect_uri: req.session.platform_DBinfo.consumerRedirect_URI,
        login_hint: req.body.login_hint,
        state: create_unique_string(30, true),
        response_mode: 'form_post',
        nonce: create_unique_string(25, false),
        prompt: 'none'
      }
      if (req.body.hasOwnProperty('lti_message_hint')) {
        response = {
          ...response,
          lti_message_hint: req.body.lti_message_hint,
        };
      }
      //Save the OIDC Login Response to reference later during current session
      req.session.login_response = response;

      res.redirect(url.format({
        pathname: platform.consumerAuthorizationURL, 
        query: req.session.login_response
      }));
    } else if (!req.session.platform_DBinfo) {
        errors.push('Issuer invalid: not registered');
    }
  });
  //errors were found, so return the errors
  if (errors.length > 0) {
    res.send('Error with OIDC Login: ' + errors);
  }
}

/*
* Create a long, unique string consisting of upper and lower case letters and numbers.
* @param length - desired length of string
* @param signed - boolean whether string should be signed with Tool's private key
* @returns unique string
*/
function create_unique_string(length, signed) {
  let unique_string = '';
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for(let i = 0; i < length; i++) {
    unique_string += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  //TODO: if signed === true, sign the string with our private key
  return unique_string;
}

module.exports = { create_oidc_response, create_unique_string };
