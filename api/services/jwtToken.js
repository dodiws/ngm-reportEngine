var jwt = require('jsonwebtoken');

// with this method we generate a new token based on payload we want to put on it
module.exports.issueToken = function(payload) {
  return jwt.sign(
          payload, // This is the payload we want to put inside the token
          process.env.TOKEN_SECRET || "oursecret"//, // Secret string which will be used to sign the token
          // {
          //   expiresInMinutes: 480
          // }
        );
};

// here we verify that the token we received on a request hasn't be tampered with.
module.exports.verifyToken = function(token, verified) {
  return jwt.verify(
            token, // The token to be verified
            process.env.TOKEN_SECRET || "oursecret", // The secret we used to sign it.
            {}, // Options, none in this case
            verified // The callback to be call when the verification is done.
         );
};

// validity in minutes
module.exports.issueTokenTime = function(payload, time) {
  return jwt.sign(
          payload, // This is the payload we want to put inside the token
          process.env.TOKEN_SECRET || "oursecret", // Secret string which will be used to sign the token
          {
            expiresInMinutes: time ? time : 10
          }
        );
};
