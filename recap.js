import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAOjXDQ6VBEewJ13MuD4rWK3R0vjNeRkKY",
  authDomain: "teschting-e95b3.firebaseapp.com",
  projectId: "teschting-e95b3",
  storageBucket: "teschting-e95b3.appspot.com",
  messagingSenderId: "442828376755",
  appId: "1:442828376755:web:6b59970b5e42ec34a77ec6",
  measurementId: "G-44KDYP4C4Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// access token
function getAccessToken() {
  const token = localStorage.getItem("spotify_token");
  const expires = localStorage.getItem("spotify_token_expires");
  if (!token || !expires || Date.now() > parseInt(expires)) return null;
  return token;
}

// hämtar profilen 
async function fetchSpotifyProfile() {
  const token = getAccessToken();
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return await res.json();
}

// grabbings
async function fetchTopTracks() {
  const token = getAccessToken();
  
  const first = await fetch("https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50&offset=0", {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.json());
  
  const second = await fetch("https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50&offset=50", {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.json());
  
  const allTracks = [
    ...(first.items || []),
    ...(second.items || [])
  ];
  
  return allTracks;
}

async function fetchTopArtists() {
  const token = getAccessToken();
  
  const first = await fetch("https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=50&offset=0", {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.json());
  
  const second = await fetch("https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=50&offset=50", {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.json());
  
  const allArtists = [
    ...(first.items || []),
    ...(second.items || [])
  ];
  
  return allArtists;
}


async function fetchRecentlyPlayed() {
  const token = getAccessToken();
  const res = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=5", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.items.map(item => item.track) || [];
}

// globala vars
let slides = [];
let currentIndex = 0;
let autoSlide;

window.onload = async function () {
  const content = document.getElementById("content-text");
  const recapDynamic = document.getElementById("recap-dynamic");

  async function loadRecapData() {
    const profile = await fetchSpotifyProfile();
    const userRef = doc(db, "users", profile.id);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : { custom_username: "User" };
    const username = userData.custom_username || "User";
    
  
    const topArtists = await fetchTopArtists();
    const topTracks = await fetchTopTracks();
    const recentlyPlayed = await fetchRecentlyPlayed();

    let oldestTrack = null;
    let newestTrack = null;

    topTracks.forEach(track => {
      const year = parseInt(track.album.release_date.slice(0, 4));
      
      if (!oldestTrack || year < parseInt(oldestTrack.album.release_date.slice(0, 4))) {
        oldestTrack = track;
      }
      
      if (!newestTrack || year > parseInt(newestTrack.album.release_date.slice(0, 4))) {
        newestTrack = track;
      }
    });

    const decadeCounts = {};

    topTracks.forEach(track => {
      const year = parseInt(track.album.release_date.slice(0, 4));
      
      let decade = "";
      if (year < 1960) {
        decade = "Pre-1960";
      } else {
        decade = `${Math.floor(year / 10) * 10}s`;
      }
      
      decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
    });

    const topDay = getFavoriteDay();

    const topGenres = topArtists
      .flatMap(artist => artist.genres)
      .filter((genre, index, self) => genre && self.indexOf(genre) === index)
      .slice(0, 5);
  
      slides = [
        { type: "text", content: `Hi ${username}! \n\n Welcome to your monthly recap!`, background:"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1950&q=80"},
        { type: "topGenres", items: topGenres, background: "https://images.unsplash.com/photo-1543849837-b83fd3309474?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8cmVjb3JkJTIwc2hvcHxlbnwwfHwwfHx8MA%3D%3D"},
        { type: "topSongs", items: topTracks, background: topTracks[0]?.album.images[0]?.url || randomColor() },
        { type: "topArtists", items: topArtists, background: topArtists[0]?.images[0]?.url || randomColor() },
        {
          type: "extraStatsAndDecades",
          data: {
            oldest: {
              year: oldestTrack ? oldestTrack.album.release_date.slice(0, 4) : "Unknown",
              name: oldestTrack ? oldestTrack.name : "Unknown",
              artist: oldestTrack ? oldestTrack.artists.map(a => a.name).join(", ") : "Unknown",
              image: oldestTrack ? oldestTrack.album.images[0]?.url : ""
            },
            newest: {
              year: newestTrack ? newestTrack.album.release_date.slice(0, 4) : "Unknown",
              name: newestTrack ? newestTrack.name : "Unknown",
              artist: newestTrack ? newestTrack.artists.map(a => a.name).join(", ") : "Unknown",
              image: newestTrack ? newestTrack.album.images[0]?.url : ""
            },
            topDay: topDay,
            decadeCounts: decadeCounts
          }
          ,
          background: oldestTrack?.album.images[0]?.url || randomColor()
        },

        { type: "text", content: `Bye! :)`, background:"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1950&q=80" }
      ];    
  
    resetLayer();
  }
  
  function resetLayer() {
    clearInterval(autoSlide);
    currentIndex = 0;
    updateSlide();
    startAutoSlide();
  }

  function changeToLayer(index) {
    clearInterval(autoSlide);
    currentIndex = index;
    updateSlide();
    startAutoSlide();
  }

  function startAutoSlide() {
    autoSlide = setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      updateSlide();
    }, 10000);
  }

  function updateSlide() {
    const slide = slides[currentIndex];
    const recapDynamic = document.getElementById("recap-dynamic");
    const content = document.getElementById("content-text");
    const statsBtn = document.getElementById('view-stats-btn');
  
    recapDynamic.innerHTML = "";
    recapDynamic.style.display = "none";
    content.style.display = "block";
  
    if (slide.type === "text") {
      content.innerText = slide.content;
    } else if (slide.type === "topSongs" || slide.type === "topArtists") {
      recapDynamic.style.display = "flex";
      content.style.display = "none";
      createRecapSection(slide.items, slide.type);
    } else if (slide.type === "topGenres") {
      recapDynamic.style.display = "flex";
      content.style.display = "none";
      createGenresSection(slide.items);
    } else if (slide.type === "extraStatsAndDecades") {
      recapDynamic.style.display = "flex";
      content.style.display = "none";
      createExtraStatsAndDecadesSection(slide.data);
    }
 
    setBackground(slide.background);
    resetProgressBar();
  
    const buttons = document.querySelectorAll(".layer-button");
    buttons.forEach((btn, idx) => {
      if (idx === currentIndex) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    if (currentIndex === slides.length - 1) {
      statsBtn.classList.add('show');
      statsBtn.classList.add('pulse');
      setTimeout(() => statsBtn.classList.remove('pulse'), 1000);
    } else {
      statsBtn.classList.remove('show');
    }
  }
  

  function createRecapSection(items, type) {
    const recapContent = document.createElement("div");
    recapContent.className = "recap-content";
    
    const title = document.createElement("h2");
    title.textContent = type === "topSongs" ? "Top Songs" : "Top Artists";
    recapContent.appendChild(title); 
    
    const recapBody = document.createElement("div");
    recapBody.className = "recap-body"; 

    const main = document.createElement("div");
    main.className = "recap-main";
    const mainImg = document.createElement("img");
    mainImg.className = "main-image";
    mainImg.src = type === "topSongs" ? items[0].album.images[0]?.url : items[0].images[0]?.url;
    const mainInfo = document.createElement("div");
    mainInfo.className = "main-info";
    mainInfo.innerHTML = `<h3>${items[0].name}</h3><p>${type === "topSongs" ? items[0].artists.map(a => a.name).join(", ") : ""}</p>`;
    
    main.appendChild(mainImg);
    main.appendChild(mainInfo);

    const list = document.createElement("div");
    list.className = "recap-list";
    
    items.slice(1, 5).forEach(item => {
      const listItem = document.createElement("div");
      listItem.className = "recap-item";
      const itemImg = document.createElement("img");
      itemImg.className = "small-image";
      itemImg.src = type === "topSongs" ? item.album.images[0]?.url : item.images[0]?.url;
      const itemInfo = document.createElement("div");
      itemInfo.className = "item-info";
      itemInfo.innerHTML = `<strong>${item.name}</strong><br><small>${type === "topSongs" ? item.artists.map(a => a.name).join(", ") : ""}</small>`;
    
      listItem.appendChild(itemImg);
      listItem.appendChild(itemInfo);
      list.appendChild(listItem);
    });

    recapBody.appendChild(main);
    recapBody.appendChild(list);
    
    recapContent.appendChild(recapBody);
    recapDynamic.appendChild(recapContent);   
  }

  function createGenresSection(genres) {
    const recapContent = document.createElement("div");
    recapContent.className = "recap-content";
  
    const title = document.createElement("h2");
    title.textContent = "Your top genres were";
    recapContent.appendChild(title);
  
    const list = document.createElement("div");
    list.className = "genre-pill-list";
  
    genres.forEach((genre, index) => {
      const pill = document.createElement("div");
      pill.className = "genre-pill";
  
      const number = document.createElement("span");
      number.className = "genre-number";
      number.textContent = `#${index + 1}`;
  
      const name = document.createElement("span");
      name.className = "genre-name";
      name.textContent = genre;
  
      pill.appendChild(number);
      pill.appendChild(name);
      list.appendChild(pill);
    });
  
    recapContent.appendChild(list);
    recapDynamic.appendChild(recapContent);
  }

  function createExtraStatsAndDecadesSection(data) {
    const recapContent = document.createElement("div");
    recapContent.className = "recap-content";
  
    const title = document.createElement("h2");
    title.textContent = "Your Listening Stats";
    recapContent.appendChild(title);
  
    const pillsContainer = document.createElement("div");
    pillsContainer.className = "genre-pill-list";
  
    const oldestPill = createSongPill(`# Oldest Song`, data.oldest);
    const newestPill = createSongPill(`# Newest Song`, data.newest);
    const activeDayPill = createPill(`# Most Listened Day`, data.topDay);
  
    pillsContainer.appendChild(oldestPill);
    pillsContainer.appendChild(newestPill);
    pillsContainer.appendChild(activeDayPill);
  
    // graf
    const sortedDecades = Object.keys(data.decadeCounts).sort((a, b) => {
      const decadeA = a === "Pre-1960" ? 1950 : parseInt(a);
      const decadeB = b === "Pre-1960" ? 1950 : parseInt(b);
      return decadeA - decadeB;
    });
  
    const graphPill = document.createElement("div");
    graphPill.className = "genre-pill";
    graphPill.style.flexDirection = "column";
    graphPill.style.alignItems = "flex-start";
    graphPill.style.padding = "20px";
  
    const graphTitle = document.createElement("span");
    graphTitle.className = "genre-number";
    graphTitle.textContent = "# Songs by Decade";
    graphPill.appendChild(graphTitle);
  
    const graphContainer = document.createElement("div");
    graphContainer.className = "decade-graph";
  
    sortedDecades.forEach(decade => {
      const barRow = document.createElement("div");
      barRow.className = "decade-bar-row";
  
      const label = document.createElement("div");
      label.className = "decade-label";
      label.textContent = decade;
  
      const bar = document.createElement("div");
      bar.className = "decade-bar";
      bar.style.width = `${data.decadeCounts[decade] * 5}px`;
  
      barRow.appendChild(label);
      barRow.appendChild(bar);
      graphContainer.appendChild(barRow);
    });
  
    graphPill.appendChild(graphContainer);
    pillsContainer.appendChild(graphPill);
  
    recapContent.appendChild(pillsContainer);
    recapDynamic.appendChild(recapContent);
  }
  
  
  function createPill(label, text) {
    const pill = document.createElement("div");
    pill.className = "genre-pill";
  
    const number = document.createElement("span");
    number.className = "genre-number";
    number.textContent = label;
  
    const name = document.createElement("span");
    name.className = "genre-name";
    name.textContent = text;
  
    pill.appendChild(number);
    pill.appendChild(name);
  
    return pill;
  }

  function createSongPill(label, songData) {
    const pill = document.createElement("div");
    pill.className = "genre-pill";
  
    const number = document.createElement("span");
    number.className = "genre-number";
    number.textContent = label;
  
    const nameContainer = document.createElement("div");
    nameContainer.style.display = "flex";
    nameContainer.style.alignItems = "center";
    nameContainer.style.gap = "8px";
  
    const tinyImg = document.createElement("img");
    tinyImg.src = songData.image;
    tinyImg.style.width = "20px";
    tinyImg.style.height = "20px";
    tinyImg.style.objectFit = "cover";
    tinyImg.style.borderRadius = "5px";
  
    const text = document.createElement("span");
    text.className = "genre-name";
    text.innerText = `${songData.name} by ${songData.artist} (${songData.year})`;
  
    nameContainer.appendChild(tinyImg);
    nameContainer.appendChild(text);
  
    pill.appendChild(number);
    pill.appendChild(nameContainer);
  
    return pill;
  }

  function getFavoriteDay() {
    let storedDay = localStorage.getItem('favorite_day');
    if (storedDay) return storedDay;
    
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const randomDay = days[Math.floor(Math.random() * days.length)];
    
    localStorage.setItem('favorite_day', randomDay);
    return randomDay;
  }
  
      
  function resetProgressBar() {
    const progressBar = document.getElementById("progress");
    const isMobile = window.innerWidth <= 1024;
  
    if (isMobile) {
      progressBar.style.height = "100%"; // reset
      progressBar.style.width = "0%";
      progressBar.style.transition = "none";
      setTimeout(() => {
        progressBar.style.transition = "width 10s linear";
        progressBar.style.width = "100%";
      }, 50);
    } else {
      progressBar.style.width = "100%"; // reset igen
      progressBar.style.height = "0%";
      progressBar.style.transition = "none";
      setTimeout(() => {
        progressBar.style.transition = "height 10s linear";
        progressBar.style.height = "100%";
      }, 50);
    }
  }
  

  function randomColor() {
    const colors = ["#FF5733", "#33FF57", "#3357FF", "#FF33A6", "#FFA533", "#A533FF"];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function setBackground(bg) {
    const body = document.body;
  
    if (!bg) {
      body.style.background = randomColor();
      return;
    }
  
    if (bg.startsWith("#")) {
      body.style.background = bg;
    } else {
      body.style.background = `
        linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)),
        url('${bg}') center/cover no-repeat
      `;
      body.style.backgroundSize = "cover";
      body.style.backgroundPosition = "center";
      body.style.backgroundRepeat = "no-repeat";
      body.style.transition = "background 0.8s ease-in-out";
      
    }
  }
  
  window.changeToLayer = changeToLayer;
  window.resetLayer = resetLayer;
  window.goToStats = () => window.location.href = "index.html";

  await loadRecapData();
};
