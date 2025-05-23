//VIKTIGT!!! Funktioner som loadposts etc... som har med customization och kommentar funktioner är endast testnings funktioner som inte följde med till slut projktet, har kvar dem pga vill utveckla ksk

// firebase import
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, updateDoc, query, orderBy, deleteField, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

  
  
  const db = getFirestore();
  const storage = getStorage();
  
  // spotify config
  const CLIENT_ID = "5ae6a0ba7af34db8b236a21abf9a83e6"; // ✅ matches dashboardg
  const REDIRECT_URI = "https://lilm0neymoe.github.io/mybeautifulsite/set_username.html";
  const AUTH_URL = "https://accounts.spotify.com/authorize";
  const SCOPES = "user-read-private user-top-read user-read-recently-played";
  
  function getSpotifyAuthURL() {
    return `${AUTH_URL}?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=${encodeURIComponent(SCOPES)}&show_dialog=true`;
  }
  
  export { getSpotifyAuthURL };
  
  
  function extractAndStoreToken() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
  
    if (token) {
      const expiresIn = 3600 * 1000;
      const expiresAt = Date.now() + expiresIn;
      localStorage.setItem("spotify_token", token);
      localStorage.setItem("spotify_token_expires", expiresAt.toString());
      window.history.replaceState(null, null, window.location.pathname);
    }
  }
  
  function getAccessToken() {
    const token = localStorage.getItem("spotify_token");
    const expires = localStorage.getItem("spotify_token_expires");
    if (!token || !expires || Date.now() > parseInt(expires)) return null;
    return token;
  }
  
  async function fetchUserProfile() {
    const token = getAccessToken();
    if (!token) return;
  
    try {
      const res = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (!res.ok) return;
  
      const user = await res.json();
      const userId = user.id;
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
  
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          spotify_id: userId,
          name: user.display_name || "",
          custom_username: "",
          created_at: new Date().toISOString()
        });
  
        window.location.href = "/mybeautifulsite/set_username.html";
        return;
      }
  
      const userData = userSnap.data();
  
      if (!userData.custom_username || userData.custom_username.trim() === "") {
        window.location.href = "/mybeautifulsite/set_username.html";
        return;
      }

      if (userData.profile_picture) {
        const img = document.createElement("img");
        img.src = userData.profile_picture;
        img.width = 100;
        document.getElementById("profile-picture-container")?.appendChild(img);
      }
  
      // om allt funkar visa användarnman
      document.getElementById("user-status").textContent = `Welcome to your full statistics, ${userData.custom_username}!`;
      document.getElementById("login-btn").style.display = "none";
      document.getElementById("logout-btn").style.display = "block";
  
      fetchSpotifyStats("short_term");
      fetchRecentlyPlayed();
    } catch (err) {
      console.error("Error in fetchUserProfile:", err);
    }
  }

  async function saveStatsToFirestore(stats) {
    const token = getAccessToken();
    if (!token) return;
  
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
  
    const user = await res.json();
    const userId = user.id;
  
    const statsRef = doc(db, "user_stats", userId);
  
    try {
      await setDoc(statsRef, stats, { merge: true });
      console.log("User stats saved to Firestore!");
    } catch (error) {
      console.error("Failed to save stats:", error);
    }
  }
  
  
  async function fetchSpotifyStats(timeRange) {
    if (timeRange === "one_week") {
      fetchOneWeekStats();
      return;
    }
    
    const token = getAccessToken();
    if (!token) return;
  
    try {
      const topTracks = await fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const trackData = await topTracks.json();
      displaySongs(trackData.items, "top-songs");
  
      const topArtists = await fetch(`https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const artistData = await topArtists.json();
      displayArtists(artistData.items, "top-artists");
      const albums = [...new Set(trackData.items.map(track => track.album))];
      displayAlbums(albums, "top-albums");
  
      // spara
      await saveStatsToFirestore({
        topSongs: trackData.items.map(track => ({
          name: track.name,
          artist: track.artists.map(a => a.name).join(", "),
          albumImage: track.album.images[0]?.url || ""
        })),
        topArtists: artistData.items.map(artist => ({
          name: artist.name,
          image: artist.images[0]?.url || ""
        })),
        topAlbums: albums.map(album => ({
          name: album.name,
          artist: album.artists.map(a => a.name).join(", "),
          image: album.images[0]?.url || ""
        }))
      });
  
    } catch (err) {
      console.error("Error fetching Spotify stats:", err);
    }
  }
  
  // nylige 
  async function fetchRecentlyPlayed() {
    const token = getAccessToken();
    if (!token) return;
  
    try {
      const response = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=10", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      displaySongs(data.items.map(item => item.track), "recently-played");
  
      // spara
      await saveStatsToFirestore({
        recentlyPlayed: data.items.map(item => ({
          name: item.track.name,
          artist: item.track.artists.map(a => a.name).join(", "),
          albumImage: item.track.album.images[0]?.url || ""
        }))
      });
  
    } catch (err) {
      console.error("Error fetching recently played:", err);
    }
  }
  
  
  // Olika desplay
  function displaySongs(songs, elId) {
    const ul = document.getElementById(elId);
    ul.innerHTML = "";
    songs.forEach(song => {
      const li = document.createElement("li");
      li.innerHTML = `<img src="${song.album.images[0].url}" width="50"> <strong>${song.name}</strong> - ${song.artists.map(a => a.name).join(", ")}`;
      ul.appendChild(li);
    });
  }
  //används ej längre
  async function fetchOneWeekStats() {
    const token = getAccessToken();
    if (!token) return;
  
    // vecka
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
    try {
      
      const response = await fetch(`https://api.spotify.com/v1/me/player/recently-played?limit=50&after=${oneWeekAgo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      const aggregatedData = {};
      data.items.forEach(item => {
        const track = item.track;
        if (aggregatedData[track.id]) {
          aggregatedData[track.id].count += 1;
        } else {
          aggregatedData[track.id] = { track: track, count: 1 };
        }
      });

      const aggregatedArray = Object.values(aggregatedData).sort((a, b) => b.count - a.count);
      const topTracks = aggregatedArray.slice(0, 10).map(item => item.track);

      displaySongs(topTracks, "top-songs");
    } catch (err) {
      console.error("Error fetching one-week stats:", err);
    }
  }
  

  function displayAlbums(albums, elId) {
    const ul = document.getElementById(elId);
    ul.innerHTML = "";
    albums.forEach(album => {
      const li = document.createElement("li");
      li.innerHTML = `<img src="${album.images[0].url}" width="50"> <strong>${album.name}</strong> - ${album.artists.map(a => a.name).join(", ")}`;
      ul.appendChild(li);
    });
  }
  
  function displayArtists(artists, elId) {
    const ul = document.getElementById(elId);
    ul.innerHTML = "";
    artists.forEach(artist => {
      const li = document.createElement("li");
      li.innerHTML = `<img src="${artist.images[0]?.url || ""}" width="50"> <strong>${artist.name}</strong>`;
      ul.appendChild(li);
    });
  }
  
  // Comments/posts
  async function submitPost() {
    const postText = document.getElementById("post-text").value.trim();
    const username = document.getElementById("user-status").textContent.replace("USER: ", "").trim();
    if (!postText || username === "NONE") return;
  
    await addDoc(collection(db, "comments"), {
      forUser: username,  
      text: postText,
      postedBy: username, 
      timestamp: new Date()
    });    
    document.getElementById("post-text").value = "";
    loadPosts();
  }
  
  async function loadPosts() {
    const ul = document.getElementById("post-list");
    ul.innerHTML = "";
    
    const pathParts = window.location.pathname.split("/");
    const viewingUsername = pathParts[pathParts.length - 1];  
  
    const q = query(collection(db, "comments"), where("forUser", "==", viewingUsername), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
  
    snap.forEach(doc => {
      const post = doc.data();
      const time = new Date(post.timestamp.seconds * 1000).toLocaleString();
      const li = document.createElement("li");
      li.innerHTML = `<strong>${post.postedBy}</strong> - <small>${time}</small><br>${post.text}`;
      ul.appendChild(li);
    });
  }
    
  // kollar vad som händer
  document.getElementById("login-btn")?.addEventListener("click", () => {
    window.location.href = getSpotifyAuthURL();
  });
  
  document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/mybeautifulsite/index.html";
  });
  
  document.getElementById("submit-post")?.addEventListener("click", submitPost);
  document.getElementById("time-range")?.addEventListener("change", e => fetchSpotifyStats(e.target.value));
  
  //profile picture
  document.getElementById("upload-pic-btn").addEventListener("click", async ()=> {
    const fileInput = document.getElementById("profile-pic-input");
    const file = fileInput.files[0];
    if (!file){
      alert("select a photo first")
      return;
    }

    const token = getAccessToken();
    if(!token){
      alert("you must be logged in")
    }

    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const user = await res.json();
    const userId = user.id;

    const storageRef = ref(storage, 'profile_pictures/${userId}.jpg')

    try{
      //laddning opp
      await uploadBytes(storageRef, file)

      //url
      const downloadURL = await getDownloadURL(storageRef)

      //spara firestore
      const userRef = doc(db, "users", userId)
      await updateDoc(userRef, {profile_picture: downloadURL});

      alert("Success!");
    } catch(error){
    console.error("error when file upload:", error)
    alert("fail uplaod")}
  })

  window.onload = () => {
    extractAndStoreToken();
  
    const token = getAccessToken();
    if (token) {
      fetchUserProfile();
      loadPosts();
      fetchRecentlyPlayed();
      setInterval(fetchRecentlyPlayed, 30000);
    } else {
      window.location.href = "/mybeautifulsite/login.html";
    }
  };
  
  window.getSpotifyAuthURL = getSpotifyAuthURL;
  
  document.getElementById("login-btn")?.addEventListener("click", () => {
    window.location.href = getSpotifyAuthURL();
  });
  
  console.log("app.js loaded");
  console.log("Redirect URI being used:", getSpotifyAuthURL());
  