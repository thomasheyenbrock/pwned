const _ = require("lodash");

const passwordRules = [
  (value) => ({
    isValid: Boolean(value),
    errorMessage: "Password is missing",
  }),
  (value) => ({
    isValid: value.length > 8,
    errorMessage: "Password must be at least 8 chacarters long",
  }),
  (value) => ({
    isValid: value.match(/[a-z]/),
    errorMessage: "Password needs a lowercase letter",
  }),
  (value) => ({
    isValid: value.match(/[A-Z]/),
    errorMessage: "Password needs a uppercase letter",
  }),
  (value) => ({
    isValid: value.match(/[0-9]/),
    errorMessage: "Password needs a digit",
  }),
];

const config = {
  registration: {
    validators: {
      username(value) {
        function validate() {
          return {
            isValid: Boolean(value),
            errorMessage: Boolean(value) ? null : "Username is not valid",
          };
        }
        return validate;
      },
      password(value) {
        function validate() {
          return (
            passwordRules
              .map((rule) => rule(value))
              .find((result) => !result.isValid) || {
              isValid: true,
              errorMessage: null,
            }
          );
        }
        return validate;
      },
    },
  },
  mongodb: "mongodb://localhost:27017",
};

exports.get = function get(key) {
  return _.get(config, key);
};
