// auth.js
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log("Logged in as:", user.uid);
  } else {
    firebase.auth().signInAnonymously()
      .then(() => {
        console.log("Signed in anonymously");
      })
      .catch((error) => {
        console.error("Auth error:", error);
      });
  }
});
