const expect = require('chai').expect;
const { valid_launch_request } = require('../Provider/launch_validation.js');

describe('Validate Launch Request', () => {
  let req = null;

  beforeEach(() => {
    req = { 
      method: 'POST',
      url: 'http://this.is.a.fake.url',
      headers: {
        'Content-Type': 'application/json' 
      },
      body: {
        nonce: 'g2f2cdPpYqPK7AwHcyXhjf5VL',
        iat: Date.now(),
        exp: Date.now() + 3600,
        iss: 'https://demo.moodle.net',
        aud: 'uuYLGWBmhhuZvBf',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': '2',
        'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://piedpiper.localtunnel.me',
        sub: '9',
        'https://purl.imsglobal.org/spec/lti/claim/roles':
        [ 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner' ],
        'https://purl.imsglobal.org/spec/lti/claim/context':
        { id: '47',
          label: 'AGILE200',
          title: 'Internship',
          type: [ 'CourseSection' ] },
        'https://purl.imsglobal.org/spec/lti/claim/resource_link': { title: 'Test LTI for Team Pied Piper', id: '4' },
        given_name: 'John',
        family_name: 'Smith',
        name: 'John Smith',
        'https://purl.imsglobal.org/spec/lti/claim/ext':
        { user_username: 'john.smith@gmail.com', lms: 'moodle-2' },
        email: 'john.smith@gmail.com',
        'https://purl.imsglobal.org/spec/lti/claim/launch_presentation':
        { locale: 'en',
          document_target: 'window',
          return_url:
            'https://www.sandiegocode.school/mod/lti/return.php?course=47&launch_container=4&instanceid=4&sesskey=xcsU4krTwV' },
        'https://purl.imsglobal.org/spec/lti/claim/tool_platform':
        { family_code: 'moodle',
          version: '2019052000.01',
          guid: 'demo.moodle.net',
          name: 'Moodle Demo',
          description: 'Moodle Demo Sandbox' },
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint':
        { scope:
            [ 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
              'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
              'https://purl.imsglobal.org/spec/lti-ags/scope/score' ],
          lineitems:
            'https://www.sandiegocode.school/mod/lti/services.php/47/lineitems?type_id=2',
          lineitem:
            'https://www.sandiegocode.school/mod/lti/services.php/47/lineitems/109/lineitem?type_id=2' },
        'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice':
        { context_memberships_url:
            'https://www.sandiegocode.school/mod/lti/services.php/CourseSection/47/bindings/2/memberships',
          service_versions: [ '1.0', '2.0' ] }
        },
      json: true, 
      session: {
        login_request: {
          iss: 'https://demo.moodle.net',
          target_link_uri: 'https://piedpiper.localtunnel.me'
        },
        platform_DBinfo: {
          consumerToolClientID: 'uuYLGWBmhhuZvBf'
        },
        nonce_list: []
      }
    };

  });

  it('should reject non-POST requests', () => {
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    req.method = 'GET';
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Method invalid');
  });

  it('should correctly validate that message has a type that is LtiResourceLinkRequest and reject if message type is not LtiResourceLinkRequest', () => {
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    req.body['https://purl.imsglobal.org/spec/lti/claim/message_type'] = 'not correct';
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('LTI message type invalid');
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/message_type'];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('LTI message type missing');
  });

  it('should correctly validate that message has a version that is 1.3.0 and reject if not', () => {
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    req.body['https://purl.imsglobal.org/spec/lti/claim/version'] = 'not correct';
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('LTI Version invalid');
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/version'];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('LTI Version missing');
  });

  it('should correctly validate that message has a deployment id that is no more than 255 characters', () => {
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    req.body['https://purl.imsglobal.org/spec/lti/claim/deployment_id'] = 'a'.repeat(266);
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Deployment ID invalid');
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/deployment_id'];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Deployment ID missing');
  });

  it('should correctly validate that message has a target link URI to exist', () => {
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'];
    req.session.nonce_list = [];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Target Link URI missing');
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'];
    req.session.nonce_list = [];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Target Link URI missing');
  });
  
  it('should correctly validate that message has a resource link id that is no more than 255 characters', () => {
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    req.body['https://purl.imsglobal.org/spec/lti/claim/resource_link'].id = 'a'.repeat(266);
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Resource Link invalid');
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/resource_link'].id;
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Resource Link missing');
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/resource_link'];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Resource Link missing');
  });
  
  it('should correctly validate that message has a sub specified that is no more than 255 characters', () => {
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    req.body['sub'] = 'a'.repeat(266);
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Sub invalid');
    delete req.body['sub'];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Sub missing');
  });
  
  it('should correctly validate that message has a role specified that is valid', () => {
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    req.body['https://purl.imsglobal.org/spec/lti/claim/roles'] = [];
    req.session.nonce_list = [];
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    req.session.nonce_list = [];
    req.body['https://purl.imsglobal.org/spec/lti/claim/roles'] = ['WRONGhttp://purl.imsglobal.org/vocab/lis/v2/institution/person#Student'];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Role invalid');
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/roles'];
    req.session.nonce_list = [];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Role missing');
  });
  
  it('should correctly validate Context if it is present', () => {
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/context'].title;
    req.session.nonce_list = [];
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/context'].label;
    req.session.nonce_list = [];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Context invalid: does not contain label OR title');
    req.body['https://purl.imsglobal.org/spec/lti/claim/context'].type = ['WRONGhttp://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering'];
    req.session.nonce_list = [];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Context invalid: type invalid');
    req.body['https://purl.imsglobal.org/spec/lti/claim/context'].type = [];
    req.session.nonce_list = [];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Context invalid: type invalid')
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/context'].type;
    req.session.nonce_list = [];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Context type missing')
  });
  
  it('should not give an error if Context is NOT present', () => {
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/context'];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.is.empty;
  });
  
  it('should check name information correctly', () => {
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    req.body.name = 5;
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Name information invalid')
  });
  
  it('should not give an error if Name information is NOT present', () => {
    delete req.body.name;
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.is.empty;
    req.session.nonce_list = [];
    delete req.body.given_name;
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.is.empty;
    delete req.body.family_name;
    req.session.nonce_list = [];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.is.empty;
  });

  it('should correctly validate Endpoint if it is present', () => {
    expect(valid_launch_request(req.body, req)).to.have.lengthOf(0);
    delete req.body['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].lineitem;
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Score setup invalid');
    delete req.body['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].lineitems;
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Score setup invalid');
    req.body['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].scope = [];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Score setup invalid')
    delete req.body['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'].scope;
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.includes('Score setup invalid')
  });
  
  it('should not give an error if Endpoint is NOT present', () => {
    delete req.body['https://purl.imsglobal.org/spec/lti/claim/endpoint'];
    expect(valid_launch_request(req.body, req)).to.be.an('array').that.is.empty;
  });
  
});
