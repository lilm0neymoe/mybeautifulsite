// auth konstants
const CLIENT_ID = "5ae6a0ba7af34db8b236a21abf9a83e6";
const REDIRECT_URI = "http://127.0.0.1:5501/set_username.html";
const AUTH_URL = "https://accounts.spotify.com/authorize";
const SCOPES = "user-read-private user-top-read user-read-recently-played";

export function getSpotifyAuthURL() {
  return `${AUTH_URL}?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(SCOPES)}&show_dialog=true`;
}
