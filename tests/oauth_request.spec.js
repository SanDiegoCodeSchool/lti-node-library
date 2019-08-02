const expect = require('chai').expect;
const axios = require('axios');
const qs = require('qs');
const app = require('../../../server/server.js');

describe('OAuth2.0 flow', function() {
  let httpServer = null;
  let url = 'http://localhost:8888';
  let token_url = url + '/oauth2/token';
  let good_data = null;
  let saved_token = null;

  beforeEach(() => {
    good_data = {
      'grant_type': 'client_credentials',
      'client_id': 'uuYLGWBmhhuZvBf',
      'client_secret': '-----BEGIN RSA PRIVATE KEY-----\nMIIEpQIBAAKCAQEAy5CSU1VCiTdrRJnYNXoO91NE5NZYr1tyjsbvghaoabyzm4D9sp40QHReFb1OBZZZAwJYc9o+LRYU83/o5mDwlzyoYpz63wzNbXLF6kYK3JqP93mMXKJAs8q1EThuZCqc4RZAFI/QhMmqovLpKnEHSl8XPgxZOch2vQa14+3XaZdAgbUxfT6x08mFg71X/oNhNxhShiSLJ6xtKxC4+IDtAOlveIdvlfC50LVcMBbZahSo+j/MBVxdDDgTnMpxM3NsI+9aib9uzBjR4Lf43+OCrEOabg9nQbCZ2F2SAr/2+Ubl3ZJe/US4jkhfTbSClQZuSVNmNM+lMGxgXsZiCbzf1QIDAQABAoIBAQCQJRxoY/xMe/C6UBI4s+i7G7yyKlH8Qk4ZaicZQAAbd6LbH3kGLV6ksYIZ9MW10SPQrK2Dw+u5M2S8lDuQPt6+yRYXVj+TCFbDBL2+ycBRPCVrwScyRTZ52bVjr0kEJuSVwpK3vKqUDNWGs2mGQyk9cZ5cspPQBfKGoaTU9ItP2aXQzMY/+KLl46gmu5SK2igEaNIsNi1k41yRw7Sa7RDIH9jdWHlcl7WKxjHlIv21E9p2RUH8vqvNeH8joVH3IyS1w5F6mxaQrHjRp9RlXAkrIrDttn7bJ3jE55AxgvoYC8P3tV+wq/uqCJE+smfkH/umi2CPHzE0OMyQB7n9REh1AoGBAPKE9yZChjOPsf0cTQwnbZEIMZV4K3r+xYDV2kDa1NfEFooo9jsg34n/OMyC6xTgGYE98/10id/unAMNsLlX4PAelc3doBNRUt/bVFoNVHaw2JsghJ6qXm8Uj8rQgcXVOMhXoAQusUOyeL+2PyBhPt193EpNqYpKARx0Zi3waG7bAoGBANbhSLAAGpvaZPulLJ0pI1AF2sf+UifCNFOwByRS3PzPVKWzNU8EuDTUfpUCTQKuU1qmu+jx9moBi8bhkXh7kGOZqv95L7UATZ/Ql/F5S53oH1E6+iEPR2vn83XNHXzCeHuPED2MMugL85KCweMvG5v9fOf6z4ovknR+dOl5FnMPAoGBAKUKyAdJjnrYd5CBCg4TZwUkRloqBa0WZOJgpr8sLV0JHS244pkqrfYDsmu7TLBQMgs6VilOfeXfRFzvnC0GGRZQOjJ3eNCsr3GYmbcPC0Qa5c3sO1SfLNT7cT/c1fQEPzhYKZWvEQO5GWOeaydmBppFZP1MDO0Hn+n1bPQmf2uxAoGBAK0Dd6M+ci5LCkQUGnfwR56HGEEvZLbeh4NamGWG0qg7x8wjHykgg7EF52XTFG60LikvVt2Y9O8lj4Xy2U5JL1kCwcwxp1f1horHSZAEOf5Kh+y/r+YuhzM676xKGxP5AUl7R3hHCjYMaXHuFm713yUaVRfzumdpJmLl7vyNoqXBAoGATG1CDbTdDX/9Pq7RI34by/16IKropqYeb8rWINtp08sIqGYo68EGohP5SDbeyP12pG4idV+6IsY8twv5bz/uhG/HWXQOeGWea8d2lcxQnfirlOVkfdux7CJisdFX4ANcwKNGWrvreFwRch44ZjnT7O4vlQ+ETzb4KXiHFmvjY9A=\n-----END RSA PRIVATE KEY-----'
    };
  });
  
  before(done => {
    httpServer = app.listen(8888);
    done();
  });
  
  after((done) => {
    httpServer.close();
    done();
  });

  it('should load successfully', () => {
    return axios.get(url)
    .then(r => expect(r.status).to.equal(200))
    .catch(error => console.log(`***error caught ${error}`));
  });

  it('should post correctly with good data', () => {
    return axios({
      method: 'POST',
      url: token_url,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: qs.stringify({
        ...good_data
      })
    })
    .then(res => {
      saved_token = res.data;
      expect(res.status).to.equal(200);
    })
    .catch(err => {
      console.log(`***error caught: ${err}`);
    });
  });

  it('should get an error if it is missing the data', () => {
    return axios({
      method: 'POST',
      url: token_url,
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    })
    .catch(err => {
      expect(err.response.status).to.equal(400);
      expect(err.response.data.error).to.equal('invalid_request');
    })
    .catch(error => console.log(`***error caught ${error}`));
  });

  it('should get an error if it is missing the client id', () => {
    return axios({
      method: 'POST',
      url: token_url,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: qs.stringify({
        'grant_type': 'client_credentials',
        'client_secret': 'alisdbvibq87b9v03qrovbasvb83qrbvbacuvbd'
        })
      })
    .catch(err => {
      expect(err.response.status).to.equal(400);
      expect(err.response.data.error).to.equal('invalid_request');
    })
    .catch(error => console.log(`***error caught ${error}`));
  });

  it('should get an error with an invalid grant type', () => {
    return axios({
      method: 'POST',
      url: token_url,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: qs.stringify({
        ...good_data,
        'grant_type': 'WHATis THIS?'
      })
    })
    .catch(err => {
      expect(err.response.status).to.equal(400);
      expect(err.response.data.error).to.equal('unsupported_grant_type');
    })
    .catch(error => console.log(`***error caught ${error}`));
  });

  it('should get an error with an invalid client id', () => {
    return axios({
      method: 'POST',
      url: token_url,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: qs.stringify({
        ...good_data,
        'client_id': ''
      })
    })
    .catch(err => {
      expect(err.response.status).to.equal(401);
      expect(err.response.data.error).to.equal('invalid_client');
    })
    .catch(error => console.log(`***error caught ${error}`));
  });

  it('should get an error with an invalid secret', () => {
    return axios({
      method: 'POST',
      url: token_url,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: qs.stringify({
        ...good_data,
        'client_secret': '' 
      })
    })
    .catch(err => {
      expect(err.response.status).to.equal(401);
      expect(err.response.data.error).to.equal('invalid_client');
    })
    .catch(error => {
      console.log(`***error caught ${error}`);
    });
  });

});

