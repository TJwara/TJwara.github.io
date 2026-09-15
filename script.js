
function onLoadReveal() {
    document.querySelector(".load-1").style.marginLeft = "0";
    document.querySelector(".load-1").style.opacity = "1";
    document.querySelector(".load-2").style.marginLeft = "0";
    document.querySelector(".load-2").style.opacity = "1";
    document.querySelector(".load-3").style.marginLeft = "0";
    document.querySelector(".load-3").style.opacity = "1";
}
  

window.addEventListener('scroll', reveal);
function reveal() {
  var reveals = document.querySelectorAll('.reveal');
  for (var i = 0; i < reveals.length; i++) {
    var windowheight = window.innerHeight;
    var revealtop = reveals[i].getBoundingClientRect().top;
    var revealpoint = 50;
    if (revealtop < windowheight - revealpoint) {
      reveals[i].classList.add('active');
    } else {
      reveals[i].classList.remove('active');
    }
  }
}

window.addEventListener('scroll', reveal2);
function reveal2() {
  var reveals = document.querySelectorAll('.reveal2');
  for (var i = 0; i < reveals.length; i++) {
    var windowheight = window.innerHeight;
    var revealtop = reveals[i].getBoundingClientRect().top;
    var revealpoint = 50;
    if (revealtop < windowheight - revealpoint) {
      reveals[i].classList.add('active2');
    } else {
      reveals[i].classList.remove('active2');
    }
  }
}

window.addEventListener('scroll', reveal3);
function reveal3() {
  var reveals = document.querySelectorAll('.reveal3');
  for (var i = 0; i < reveals.length; i++) {
    var windowheight = window.innerHeight;
    var revealtop = reveals[i].getBoundingClientRect().top;
    var revealpoint = 50;
    if (revealtop < windowheight - revealpoint) {
      reveals[i].classList.add('active3');
    } else {
      reveals[i].classList.remove('active3');
    }
  }
}
 

/* ====================================================================== */
/* MOBILE MENU                                                             */
/* ====================================================================== */

const menuBtn = document.getElementById("menuBtn");
const sideNav = document.getElementById("sideNav");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("closeBtn");
const dropdownToggles = document.querySelectorAll(".dropdown-toggle");

if (menuBtn && sideNav && overlay && closeBtn) {
  function openMenu() {
    sideNav.classList.add("show");
    overlay.classList.add("show");
    menuBtn.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    sideNav.classList.remove("show");
    overlay.classList.remove("show");
    menuBtn.classList.remove("active");
    document.body.style.overflow = "";
  }

  menuBtn.addEventListener("click", () => {
    if (sideNav.classList.contains("show")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  closeBtn.addEventListener("click", closeMenu);
  overlay.addEventListener("click", closeMenu); 

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) {
      closeMenu();
    }
  });

  sideNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

  

