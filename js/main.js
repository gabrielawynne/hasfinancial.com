// ---------- Live Google Reviews (optional) ----------
// Fill these in to pull live reviews from your Google Business Profile via
// the official Google Places API (New). Until both are set, the site just
// keeps showing the curated reviews already written into the page markup.
//
// How to get these values:
//   1. Go to console.cloud.google.com, create (or pick) a project.
//   2. Enable "Places API (New)" for that project (requires a billing
//      account on the project, but normal traffic for a small business site
//      stays within Google's free monthly credit).
//   3. Create an API key (APIs & Services > Credentials), then restrict it
//      to your domain (hasfinancial.com) under "Application restrictions".
//   4. Find your Place ID at https://developers.google.com/maps/documentation/places/web-service/place-id
//      (search your business name/address there) and paste it below.
var GOOGLE_PLACES_CONFIG = {
  apiKey: "",
  placeId: "",
};

function escapeHtml(value) {
  var div = document.createElement("div");
  div.textContent = value == null ? "" : value;
  return div.innerHTML;
}

function loadLiveGoogleReviews(rail, onLoaded) {
  if (!GOOGLE_PLACES_CONFIG.apiKey || !GOOGLE_PLACES_CONFIG.placeId) {
    return;
  }

  var url = "https://places.googleapis.com/v1/places/" + GOOGLE_PLACES_CONFIG.placeId;

  fetch(url, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_PLACES_CONFIG.apiKey,
      "X-Goog-FieldMask": "reviews,rating,userRatingCount",
    },
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Places API request failed");
      }
      return response.json();
    })
    .then(function (data) {
      if (!data.reviews || !data.reviews.length) {
        return;
      }

      rail.innerHTML = data.reviews
        .map(function (review) {
          var name =
            review.authorAttribution && review.authorAttribution.displayName
              ? review.authorAttribution.displayName
              : "Google User";
          var text = review.text && review.text.text ? review.text.text : "";
          var rating = Math.max(0, Math.min(5, Math.round(review.rating) || 0));
          var stars = "&#9733;".repeat(rating) + "&#9734;".repeat(5 - rating);

          return (
            '<div class="testimonial-slide"><div class="testimonial-card"><div class="review-header"><div class="author-name">' +
            escapeHtml(name) +
            '</div><div class="stars">' +
            stars +
            '</div></div><p>&ldquo;' +
            escapeHtml(text) +
            "&rdquo;</p></div></div>"
          );
        })
        .join("");

      onLoaded();

      var badge = document.querySelector(".rating-badge span:last-child");
      if (badge && data.rating && data.userRatingCount) {
        badge.textContent = data.rating.toFixed(1) + " on Google · " + data.userRatingCount + " reviews";
      }
    })
    .catch(function () {
      // Keep the static, curated reviews already in the page as a fallback.
    });
}

document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  var hoursRows = document.querySelectorAll(".hours-card .hours-row[data-day]");

  if (hoursRows.length) {
    var todayIndex = String(new Date().getDay());

    hoursRows.forEach(function (row) {
      row.classList.toggle("today", row.getAttribute("data-day") === todayIndex);
    });
  }

  var carousel = document.querySelector(".testimonial-carousel");

  if (carousel) {
    var track = carousel.querySelector(".testimonial-track");
    var rail = track.querySelector(".testimonial-rail");
    var prevBtn = carousel.querySelector(".carousel-btn.prev");
    var nextBtn = carousel.querySelector(".carousel-btn.next");
    var dotsWrap = carousel.querySelector(".carousel-dots");
    var slides = [];
    var dots = [];
    var index = 0;
    var timer = null;
    // Must match .testimonial-carousel .testimonial-slide's flex-basis in
    // styles.css — used to center the active slide and peek its neighbors.
    var SLIDE_WIDTH = 70;

    function goTo(i) {
      if (!slides.length) {
        return;
      }
      index = (i + slides.length) % slides.length;

      // Rail position accounts for the leading clone slide added in
      // rebuild() (real slide 0 sits at rail position 1, etc).
      var railPosition = index + 1;
      var offset = 50 - railPosition * SLIDE_WIDTH - SLIDE_WIDTH / 2;
      rail.style.transform = "translateX(" + offset + "%)";

      Array.prototype.forEach.call(rail.children, function (slide, ri) {
        slide.classList.toggle("active", ri === railPosition);
      });

      dots.forEach(function (dot, di) {
        dot.classList.toggle("active", di === index);
      });
    }

    function restartAutoplay() {
      if (timer) {
        clearInterval(timer);
      }
      var delay = parseInt(carousel.getAttribute("data-autoplay"), 10);
      if (delay && slides.length > 1) {
        timer = setInterval(function () {
          goTo(index + 1);
        }, delay);
      }
    }

    // Rebuilds slide/dot references from whatever is currently in the DOM.
    // Called on init, and again after a live Google Reviews fetch replaces
    // the track's contents (see loadLiveGoogleReviews below).
    function rebuild() {
      // Drop peek clones from any previous build before re-collecting.
      Array.prototype.slice.call(rail.querySelectorAll("[data-clone]")).forEach(function (clone) {
        clone.remove();
      });

      slides = Array.prototype.slice.call(rail.querySelectorAll(".testimonial-slide"));

      if (slides.length > 1) {
        var cloneOfLast = slides[slides.length - 1].cloneNode(true);
        cloneOfLast.setAttribute("data-clone", "true");
        cloneOfLast.setAttribute("aria-hidden", "true");
        cloneOfLast.classList.remove("active");
        rail.insertBefore(cloneOfLast, rail.firstChild);

        var cloneOfFirst = slides[0].cloneNode(true);
        cloneOfFirst.setAttribute("data-clone", "true");
        cloneOfFirst.setAttribute("aria-hidden", "true");
        cloneOfFirst.classList.remove("active");
        rail.appendChild(cloneOfFirst);
      }

      dotsWrap.innerHTML = "";

      slides.forEach(function (_, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "dot";
        dot.setAttribute("aria-label", "Go to review " + (i + 1));
        dot.addEventListener("click", function () {
          goTo(i);
          restartAutoplay();
        });
        dotsWrap.appendChild(dot);
      });

      dots = Array.prototype.slice.call(dotsWrap.querySelectorAll(".dot"));

      // Jump to the opening slide without animating the very first paint.
      rail.style.transition = "none";
      goTo(0);
      // eslint-disable-next-line no-unused-expressions
      rail.offsetHeight; // force reflow so the "none" transition takes effect
      rail.style.transition = "";

      restartAutoplay();
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        goTo(index - 1);
        restartAutoplay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        goTo(index + 1);
        restartAutoplay();
      });
    }

    carousel.addEventListener("mouseenter", function () {
      if (timer) {
        clearInterval(timer);
      }
    });

    carousel.addEventListener("mouseleave", restartAutoplay);

    window.addEventListener("resize", function () {
      goTo(index);
    });

    rebuild();
    loadLiveGoogleReviews(rail, rebuild);
  }

  var form = document.querySelector("#contact-form");
  var status = document.querySelector("#form-status");

  if (form && status) {
    var submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = form.querySelector("#name").value.trim();
      var email = form.querySelector("#email").value.trim();

      if (!name || !email) {
        status.textContent = "Please fill in your name and email before sending.";
        status.className = "form-status visible error";
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
      }

      fetch(form.action, {
        method: form.method,
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
        .then(function (response) {
          if (response.ok) {
            status.textContent = "Thanks! Your message has been sent — we'll be in touch soon.";
            status.className = "form-status visible info";
            form.reset();
          } else {
            return response.json().then(function (data) {
              var message =
                data && data.errors
                  ? data.errors.map(function (e) { return e.message; }).join(", ")
                  : "Something went wrong. Please try again or contact us directly.";
              status.textContent = message;
              status.className = "form-status visible error";
            });
          }
        })
        .catch(function () {
          status.textContent = "Something went wrong. Please try again or contact us directly.";
          status.className = "form-status visible error";
        })
        .finally(function () {
          if (submitButton) {
            submitButton.disabled = false;
          }
        });
    });
  }
});
