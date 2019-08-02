# Example Tool for LTI 1.3 Compliant NodeJS Library 

This repository contains an Example Tool that demonstrates how the **node-lti-v1p3 Library** can be implemented.  There are two parts to this repo:

A. An Example Tool which can be integrated into an LTI1.3 compliant learning Platform

B. An HTML-based illustration of the Authorization flow used in LTI1.3

---

To use this repo, clone it to your local machine and run:
```
npm install
```
You will also need MongoDB and localtunnel installed.  Instructions to install MongoDB can be found here:

* MacOS - use homebrew: https://docs.mongodb.com/master/tutorial/install-mongodb-on-os-x/
* Windows - use the installer from here: https://docs.mongodb.com/master/tutorial/install-mongodb-on-windows/

Install localtunnel by running:
```
npm install -g localtunnel
```

### A. Use Example Tool

The Example Tool can be dropped into a Platform so that you can experience the Library's usage in a live environment.  This demo uses the Moodle's sandbox to Register the Tool with the Moodle Platform. To do this:

1. Login to https://demo.moodle.net with credentials admin / sandbox

2. Under `Site Administration`, go to the `Plugins` tab and click `External Tool->Manage Tools`

3. Click `configure a tool manually` and, at minimum, add:
- Tool's Name
- Tool's Base URL:  https://piedpiper.localtunnel.me
- Mark the tool as a 'LTI1.3' Tool
- Initiate Login URL - https://piedpiper.localtunnel.me/oidc
- Redirection URIs - https://piedpiper.localtunnel.me/project/submit
- Enable Assignment and Grade Services
- Enable sharing of launcher's name
- Choose 'Always' Accept grades from the Tool 

4. After clicking `Save changes`, click the Menu icon for the Tool you just added and make note of the Tool Configuration Details
- Add the Client ID from this information to the server.js file on the 3rd line of the object for `registerPlatform` for demo.moodle.net

5. Back in the Moodle sandbox, click `Dashboard` and click any of the demo courses.  Use the Gear icon to `Turn editing on`.  You will then be able to `Add an Activty or Resource` for an `External Tool`.  Simply give it a name and select the Tool you added above from the drop down box for `Preconfigured tool`.  Click `Save and return to course`.

6. Run localtunnel, MongoDB, and your server in separate terminals:
```
lt --port 3000 --subdomain piedpiper
mongod
npm start
```

7. In the upper right corner of the Moodle sandbox, switch your role to Student, and then click on the Tool you just added to the course you chose.  The Example Tool will now display.
 
The Example Tool is a Project Submission Grader.  When the Tool is launched, the student will see a form where they can enter a Github URL and a Heroku and/or Now URL.  After the student enters the URLs of their project and clicks Submit, the Tool will grade the project. 

  In order to Submit a project, URLs should be formatted similar to:
    
    http://www.github.com/
              OR
    http://www.herokuapp.com  or  http://www.now.sh

If the URLs are not properly formatted and/or the GitHub URL doesn't launch successfully, the student will see an error message.  With a valid project, when the student clicks Submit, s/he will be shown the resulting grade and the Tool uses the Library to pass the grade back to the Platform.

Finally, when the student clicks Done, the student is returned to the Platform.  The Teacher or Administrator on the Platform should be able to see that a grade has been used for test student for the Example Tool.

### B. View the OIDC Tool Launch Flow

The Example Tool repo also contains an illustration of the Authorization flow which occurs within the Library when you drop a Tool into a Platform.  In order to run the example, start the MongoDB and your server by running in separate terminals:

```
mongod
npm start
```

Go to `http://localhost:3000/` in your browser.  The example walks through what occurs behind-the-scenes during an LTI1.3 Tool launch.  It is important to understand that the Platform users (students, teachers) do not see any of this flow, this all occurs behind the scenes.  Also, the Tool on this page is a mockup and not fully functional, see the next section for how you can implement the functional Example Tool in a running Platform.

#### View Behind the Scenes Launch Flow

> 1. Clicking the 'Initiate Tool from LMS' button will generate a properly formatted OIDC Login Request that a Platform would create:
> ```java
> { iss: 'https://demo.moodle.net',
>   target_link_uri: 'https://piedpiper.localtunnel.me',
>   login_hint: '9',
>   lti_message_hint: '377' }
> ```
> 2. The Library validates the request and constructs a properly formatted OIDC Login Response.  This response is sent to  the Platform's OIDC Authorization endpoint that was received during Registration.  
> 
> ```java
> { 'scope': 'openid', 
>   'response_type': 'id_token', 
>   'client_id': 'SDF7ASDLSFDS9', 
>   'redirect_uri': 'https://piedpiper.localtunnel.me', 
>   'login_hint': '9', 
>   'state': 'vSSRdELr5noUNazBuYmlpYywYBeDlF', 
>   'response_mode': 'form_post', 
>   'nonce': 'oNa1yWsS8erQA2iYqYzEi4pbP', 
>   'prompt': 'none', 
>   'lti_message_hint': '377' }
> ```
>
> 3. The Platform will validate the login response and initiate the Tool launch by sending a JWT, which the Library decodes to an object like:
> 
> ```java
> { nonce: 'oNa1yWsS8erQA2iYqYzEi4pbP',
>   iat: 1564506231,
>   exp: 1564506291,
>   iss: 'https://demo.moodle.net',
>   aud: 'uuYLGWBmhhuZvBf',
>   'https://purl.imsglobal.org/spec/lti/claim/deployment_id': '2',
>   'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://piedpiper.localtunnel.me/',
>   sub: '9',
>   'https://purl.imsglobal.org/spec/lti/claim/roles':
>    [ 'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner' ],
>   'https://purl.imsglobal.org/spec/lti/claim/context':
>    { id: '47',
>      label: 'AGILE200',
>      title: 'Internship',
>      type: [ 'CourseSection' ] },
>   'https://purl.imsglobal.org/spec/lti/claim/resource_link': { title: 'Test LTI for Team Pied Piper', id: '4' },
>   given_name: 'John',
>   family_name: 'Smith',
>   name: 'John Smith',
>   'https://purl.imsglobal.org/spec/lti/claim/ext':
>    { user_username: 'john.smith@gmail.com', lms: 'moodle-2' },
>   email: 'john.smith@gmail.com',
>   'https://purl.imsglobal.org/spec/lti/claim/launch_presentation':
>    { locale: 'en',
>      document_target: 'window',
>      return_url:
>       'https://demo.moodle.net/mod/lti/return.php?course=47&launch_container=4&instanceid=4&sesskey=xcsU4krTwV' },
>   'https://purl.imsglobal.org/spec/lti/claim/tool_platform':
>    { family_code: 'moodle',
>      version: '2019052000.01',
>      guid: 'demo.moodle.net',
>      name: 'Moodle Demo',
>      description: 'Moodle Demo Sandbox' },
>   'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
>   'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
>   'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint':
>    { scope:
>       [ 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
>         'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
>         'https://purl.imsglobal.org/spec/lti-ags/scope/score' ],
>      lineitems:
>       'https://demo.moodle.net/mod/lti/services.php/47/lineitems?type_id=2',
>      lineitem:
>       'https://demo.moodle.net/mod/lti/services.php/47/lineitems/109/lineitem?type_id=2' },
>   'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice':
>    { context_memberships_url:
>       'https://demo.moodle.net/mod/lti/services.php/CourseSection/47/bindings/2/memberships',
>      service_versions: [ '1.0', '2.0' ] } }
> ```
> 
> 4. If a valid request was sent, it will redirect the student to the Tool.  Note:  The Tool is **not** operational in this demo.

#### Generate Access Token

> Clicking the 'Get Token' button will display a JSON Web Token that the Library is able to create:
> 
> ```java
> {
>   sub: < your Tool's Client ID >,
>   expires_in: 3600,             // 1 hour per LTI1.3 spec
>   token_type: 'bearer',
>   scope: < valid scope being requested >
> }
> ```
> If successful, the example will display the token authorizing the Tool to have access to the Platform's API.  This token is secured as a JWT, so the Platform will be able to verify the JWT on their side with the public key.
> 
> If you want to view the JSON object that is being passed through the JWT, copy the token and paste it into the 'JWT String box' on https://www.jsonwebtoken.io/.  This will enable you to view the JSON object on the Payload.


---

### Contributors
* Argenis De Los Santos
* Gian Delprado
* Godfrey Martinez
* Michael Roberts
* Sherry Freitas

---

### Keywords

LTI LMS Tool LTIv1.3 Node/Express Javascript