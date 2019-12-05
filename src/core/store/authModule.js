import farmOS from 'farmos';

const lazyFarm = () => {
  const host = localStorage.getItem('host');
  const user = localStorage.getItem('username');
  const password = localStorage.getItem('password');
  return farmOS(host, user, password);
};

const safeSetLS = (key, value) => {
  if (value) {
    localStorage.setItem(key, value);
  } else {
    localStorage.removeItem(key);
  }
};

export default {
  actions: {

    didSubmitCredentials({ commit }, payload) {
      const url = (process.env.NODE_ENV === 'development')
        ? ''
        : `https://${payload.farmosUrl}`;
      const { username, password, router } = payload;
      const storage = window.localStorage;

      function handleLoginError(error) {
        if (error.status === 403) {
          const resetUrl = `${url}/user/password`;
          const errorPayload = {
            message: `The username or password you entered was incorrect. Please try again, or <a href="${resetUrl}">reset your password</a>.`,
            errorCode: error.statusText,
            level: 'warning',
            show: true,
          };
          commit('logError', errorPayload);
        } else {
          const errorPayload = {
            message: `Unable to reach the server. Please check that you have the correct URL and that your device has a network connection. Status: ${error.message}`,
            errorCode: error.statusText,
            level: 'warning',
            show: true,
          };
          commit('logError', errorPayload);
        }
      }

      // Return a promise so the component knows when the action completes.
      return new Promise((resolve) => {
        const farm = farmOS(url, username, password);
        farm.authenticate()
          .then((tokenResponse) => {
            // Save our username, password & token to the persistant store
            storage.setItem('host', url);
            storage.setItem('username', username);
            storage.setItem('password', password);
            storage.setItem('token', tokenResponse);

            // Go back 1 page, or reroute to home page
            if (window.history.length > 1) {
              window.history.back();
              resolve();
              return;
            }
            router.push('/');
            resolve();
          })
          .catch(() => {
            // Check if the login attempt failed b/c it's http://, not https://
            const noSslUrl = `http://${payload.farmosUrl}`;
            const noSslfarm = farmOS(noSslUrl, username, password);
            noSslfarm.authenticate() // eslint-disable-line
              .then((tokenResponse) => {
                // Save our username, password & token to the persistant store
                storage.setItem('host', noSslUrl);
                storage.setItem('username', username);
                storage.setItem('password', password);
                storage.setItem('token', tokenResponse);

                // Go back 1 page, or reroute to home page
                if (window.history.length > 1) {
                  window.history.back();
                  resolve();
                  return;
                }
                router.push('/');
                resolve();
              }).catch((error) => {
                handleLoginError(error);
                resolve();
              });
          });
      });
    },

    logout() {
      lazyFarm().logout().then(() => {
        // Currently farmOS.js returns no response to logout requests
      });
    },

    updateUserAndSiteInfo({ commit }) {
      const username = localStorage.getItem('username');
      if (username) {
        // Request user and site info if the user is logged in
        lazyFarm().info().then((res) => {
          commit('changeFarmName', res.name);
          commit('changeFarmUrl', res.url);
          commit('changeUsername', res.user.name);
          commit('changeEmail', res.user.mail);
          commit('changeUid', res.user.uid);
          commit('changeMapboxAPIKey', res.mapbox_api_key);
          commit('changeSystemOfMeasurement', res.system_of_measurement);
          commit('changeLogTypes', res.resources.log);
          commit('setLoginStatus', true);
          localStorage.setItem('farmName', res.name);
          localStorage.setItem('username', res.user.name);
          localStorage.setItem('email', res.user.mail);
          localStorage.setItem('uid', res.user.uid);
          safeSetLS('mapboxAPIKey', res.mapbox_api_key);
          localStorage.setItem('systemOfMeasurement', res.system_of_measurement);
          localStorage.setItem('logTypes', JSON.stringify(res.resources.log));
          localStorage.setItem('isLoggedIn', true);
        });
      }
    },

    loadCachedUserAndSiteInfo({ commit }) {
      commit('changeUsername', localStorage.getItem('username'));
      commit('changeEmail', localStorage.getItem('email'));
      commit('changeUid', localStorage.getItem('uid'));
      commit('changeMapboxAPIKey', localStorage.getItem('mapboxAPIKey'));
      commit('changeSystemOfMeasurement', localStorage.getItem('systemOfMeasurement'));
      commit('setLoginStatus', JSON.parse(localStorage.getItem('isLoggedIn')));
      commit('changeFarmName', localStorage.getItem('farmName'));
      commit('changeFarmUrl', localStorage.getItem('host'));
      commit('changeLogTypes', JSON.parse(localStorage.getItem('logTypes')));
      commit('setUseGeolocation', JSON.parse(localStorage.getItem('useGeolocation')));
    },

    deleteCachedUserAndSiteInfo({ commit }) {
      commit('changeFarmName', '');
      commit('changeFarmUrl', '');
      commit('changeUsername', '');
      commit('changeEmail', '');
      commit('changeUid', '');
      commit('changeMapboxAPIKey', '');
      commit('changeSystemOfMeasurement', 'metric');
      commit('setLoginStatus', false);
      localStorage.clear();
    },
  },
};
