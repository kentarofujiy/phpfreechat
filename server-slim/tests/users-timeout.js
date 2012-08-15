#!/usr/bin/env node

var vows = require('vows'),
    assert = require('assert'),
    request = require('request'),
    async = require('async'),
    querystring = require('querystring'),
    baseurl = 'http://127.0.0.1:32773/server-slim',
    j1 = request.jar(),
    j2 = request.jar(),
    userdata1 = {},
    userdata2 = {},
    cid1 = 'cidtimeout_1',
    cid2 = 'cidtimeout_2';

vows.describe('User timeout').addBatch({

  'user1 wait 3 seconds and user2 check his messages each second': {
    topic: function () {
      var self = this;
      var tmsg = [];
      
      // user1 auth
      request({
        method: 'GET',
        url: baseurl+'/auth',
        headers: { 'Pfc-Authorization': 'Basic '+new Buffer("testtimeout1:password").toString('base64') }, 
        jar: j1,
      }, function (err, res, body) {
        userdata1 = JSON.parse(body); 
        
        // this user is timouted (he will leave the chat with a timeout message)
        setTimeout(function () {
          
          // check that the user has been well disconnected
          request({
            method: 'GET',
            url: baseurl+'/users/'+userdata1.id+'/',
            jar: j1,
          }, function (err, res, body) {
            self.callback(null, tmsg);            
          });
          
        }, 3000);
        
      });
      
      // user2 auth
      request({
        method: 'GET',
        url: baseurl+'/auth',
        headers: { 'Pfc-Authorization': 'Basic '+new Buffer("testtimeout2:password").toString('base64') }, 
        jar: j2,
      }, function (err, res, body) {
        userdata2 = JSON.parse(body);
        function user2readmsg() {
          // each seconds check for user2 messages (so this user is keept alived)
          setTimeout(function () {
            request({
              method: 'GET',
              url: baseurl+'/users/'+userdata2.id+'/msg/',
              jar: j2,
            }, function (err, res, body) {
              // TODO: the timeout leave message doesn't appear if no channels are joined
              tmsg = tmsg.concat(JSON.parse(body)); // get the timeout leave message of user1
            });
            user2readmsg();
          }, 1000);
        }
        user2readmsg();
      });

    },
    
    'server tells that user is authenticated with a success code': function (error, tmsg) {
      assert.lengthOf(tmsg, 1);
      assert.equal(tmsg[0].type, 'leave');
      assert.equal(tmsg[0].sender, userdata1.id);
    },
  },

}).export(module);