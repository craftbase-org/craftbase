export function setPeronsalInformation(type, data) {
  return async function(dispatch) {
    try {
      await dispatch({
        type,
        payload: data
      });

      // successCallback && successCallback(response);
    } catch (e) {
      console.error(e);
      // errorCallback && errorCallback(e.response);
    }
  };
}
