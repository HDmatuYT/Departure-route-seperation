/**
 * TATARI LOOMAKLIINIK - Main JavaScript
 * Pure vanilla JS, no frameworks
 */

(function() {
    'use strict';
  
    // ========================================
    // Mobile Navigation
    // ========================================
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNav = document.getElementById('mobile-nav');
  
    if (menuToggle && mobileNav) {
      menuToggle.addEventListener('click', function() {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
        mobileNav.hidden = isExpanded;
        document.body.style.overflow = isExpanded ? '' : 'hidden';
      });
  
      // Close mobile menu when clicking a link
      const mobileLinks = mobileNav.querySelectorAll('a');
      mobileLinks.forEach(function(link) {
        link.addEventListener('click', function() {
          menuToggle.setAttribute('aria-expanded', 'false');
          mobileNav.hidden = true;
          document.body.style.overflow = '';
        });
      });
  
      // Close mobile menu on escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !mobileNav.hidden) {
          menuToggle.setAttribute('aria-expanded', 'false');
          mobileNav.hidden = true;
          document.body.style.overflow = '';
          menuToggle.focus();
        }
      });
    }
  
    // ========================================
    // Smooth Scroll for Anchor Links
    // ========================================
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const headerOffset = 80;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  
    // ========================================
    // FAQ Accordion Animation
    // ========================================
    const faqItems = document.querySelectorAll('.faq-item');
  
    faqItems.forEach(function(item) {
      const summary = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
  
      if (summary && answer) {
        summary.addEventListener('click', function(e) {
          e.preventDefault();
          
          const isOpen = item.open;
          
          // Close all other items
          faqItems.forEach(function(otherItem) {
            if (otherItem !== item && otherItem.open) {
              const otherAnswer = otherItem.querySelector('.faq-answer');
              if (otherAnswer) {
                otherAnswer.style.maxHeight = otherAnswer.scrollHeight + 'px';
                requestAnimationFrame(function() {
                  otherAnswer.style.maxHeight = '0';
                  otherAnswer.style.paddingBottom = '0';
                });
                setTimeout(function() {
                  otherItem.open = false;
                  otherAnswer.style.maxHeight = '';
                  otherAnswer.style.paddingBottom = '';
                }, 250);
              }
            }
          });
  
          if (isOpen) {
            // Close current
            answer.style.maxHeight = answer.scrollHeight + 'px';
            requestAnimationFrame(function() {
              answer.style.maxHeight = '0';
              answer.style.paddingBottom = '0';
            });
            setTimeout(function() {
              item.open = false;
              answer.style.maxHeight = '';
              answer.style.paddingBottom = '';
            }, 250);
          } else {
            // Open current
            item.open = true;
            const height = answer.scrollHeight;
            answer.style.maxHeight = '0';
            answer.style.paddingBottom = '0';
            requestAnimationFrame(function() {
              answer.style.maxHeight = height + 'px';
              answer.style.paddingBottom = '24px';
            });
            setTimeout(function() {
              answer.style.maxHeight = '';
              answer.style.paddingBottom = '';
            }, 250);
          }
        });
      }
    });
  
    // ========================================
    // Cookie Consent Banner
    // ========================================
    const cookieBanner = document.getElementById('cookie-banner');
    const cookieBtn = document.getElementById('cookie-noustun');
    const COOKIE_KEY = 'tatari-cookie-consent';
  
    function showCookieBanner() {
      if (cookieBanner && !localStorage.getItem(COOKIE_KEY)) {
        cookieBanner.hidden = false;
      }
    }
  
    if (cookieBtn) {
      cookieBtn.addEventListener('click', function() {
        localStorage.setItem(COOKIE_KEY, 'true');
        if (cookieBanner) {
          cookieBanner.style.transform = 'translateY(100%)';
          cookieBanner.style.opacity = '0';
          setTimeout(function() {
            cookieBanner.hidden = true;
          }, 300);
        }
      });
    }
  
    // Show banner after a short delay
    setTimeout(showCookieBanner, 1500);
  
    // ========================================
    // Current Year in Footer
    // ========================================
    const yearEl = document.getElementById('aasta');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  
    // ========================================
    // Scroll Reveal Animation
    // ========================================
    const revealElements = document.querySelectorAll(
      '.service-card, .testimonial-card, .stat-card, .faq-item, .exotic-content, .about-content'
    );
  
    function revealOnScroll() {
      const windowHeight = window.innerHeight;
      const revealPoint = 100;
  
      revealElements.forEach(function(el) {
        const elementTop = el.getBoundingClientRect().top;
        if (elementTop < windowHeight - revealPoint) {
          el.classList.add('revealed');
        }
      });
    }
  
    // Add reveal styles dynamically
    const revealStyle = document.createElement('style');
    revealStyle.textContent = `
      .service-card,
      .testimonial-card,
      .stat-card,
      .faq-item,
      .exotic-content,
      .about-content {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }
      .service-card.revealed,
      .testimonial-card.revealed,
      .stat-card.revealed,
      .faq-item.revealed,
      .exotic-content.revealed,
      .about-content.revealed {
        opacity: 1;
        transform: translateY(0);
      }
      .service-card:nth-child(1) { transition-delay: 0ms; }
      .service-card:nth-child(2) { transition-delay: 80ms; }
      .service-card:nth-child(3) { transition-delay: 160ms; }
      .service-card:nth-child(4) { transition-delay: 240ms; }
      .service-card:nth-child(5) { transition-delay: 320ms; }
      .service-card:nth-child(6) { transition-delay: 400ms; }
      .testimonial-card:nth-child(1) { transition-delay: 0ms; }
      .testimonial-card:nth-child(2) { transition-delay: 100ms; }
      .testimonial-card:nth-child(3) { transition-delay: 200ms; }
      .stat-card:nth-child(1) { transition-delay: 0ms; }
      .stat-card:nth-child(2) { transition-delay: 100ms; }
      .stat-card:nth-child(3) { transition-delay: 200ms; }
      .faq-item:nth-child(1) { transition-delay: 0ms; }
      .faq-item:nth-child(2) { transition-delay: 60ms; }
      .faq-item:nth-child(3) { transition-delay: 120ms; }
      .faq-item:nth-child(4) { transition-delay: 180ms; }
      .faq-item:nth-child(5) { transition-delay: 240ms; }
    `;
    document.head.appendChild(revealStyle);
  
    window.addEventListener('scroll', revealOnScroll, { passive: true });
    window.addEventListener('resize', revealOnScroll, { passive: true });
    
    // Initial check
    setTimeout(revealOnScroll, 100);
  
    // ========================================
    // Header Scroll Effect
    // ========================================
    const header = document.querySelector('.site-header');
    let lastScroll = 0;
  
    function handleHeaderScroll() {
      const currentScroll = window.pageYOffset;
      
      if (header) {
        if (currentScroll > 50) {
          header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.06)';
        } else {
          header.style.boxShadow = 'none';
        }
      }
      
      lastScroll = currentScroll;
    }
  
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
    handleHeaderScroll();
  
    // ========================================
    // Active Navigation Link on Scroll
    // ========================================
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-list a[href^="#"], .mobile-nav-list a[href^="#"]');
  
    function highlightNav() {
      const scrollPos = window.pageYOffset + 150;
  
      sections.forEach(function(section) {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
  
        if (scrollPos >= top && scrollPos < top + height) {
          navLinks.forEach(function(link) {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            }
          });
        }
      });
    }
  
    window.addEventListener('scroll', highlightNav, { passive: true });
  
    // Add active nav style
    const activeNavStyle = document.createElement('style');
    activeNavStyle.textContent = `
      .nav-list a.active::after,
      .mobile-nav-list a.active {
        width: 100%;
        color: var(--primary);
      }
      .mobile-nav-list a.active {
        background: var(--bg-soft);
      }
    `;
    document.head.appendChild(activeNavStyle);
  
    // ========================================
    // Emergency Banner Dynamic State
    // ========================================
    const emergencyBanner = document.querySelector('.emergency-banner');
    
    function updateEmergencyBanner() {
      if (!emergencyBanner) return;
      
      const now = new Date();
      const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const hour = now.getHours();
      const isOpen = day >= 1 && day <= 5 && hour >= 10 && hour < 18;
      
      const content = emergencyBanner.querySelector('.emergency-content');
      if (content) {
        if (isOpen) {
          content.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <p><strong>Tere tulemast!</strong> Kliinik on hetkel <strong>avatud</strong> (E–R 10:00–18:00). Helista <a href="tel:+3726467084">+372 646 7084</a> visiidi broneerimiseks.</p>
          `;
          emergencyBanner.style.background = 'linear-gradient(135deg, #dcfce7, #bbf7d0)';
          emergencyBanner.style.borderBottomColor = '#86efac';
          content.style.color = '#166534';
          const icon = content.querySelector('.icon');
          if (icon) icon.style.color = '#16a34a';
        }
      }
    }
    
    updateEmergencyBanner();
    // Update every minute
    setInterval(updateEmergencyBanner, 60000);
  
    // ========================================
    // Preconnect for Performance
    // ========================================
    const preconnectGoogle = document.createElement('link');
    preconnectGoogle.rel = 'preconnect';
    preconnectGoogle.href = 'https://maps.googleapis.com';
    document.head.appendChild(preconnectGoogle);
  
  })();
  (function () {
    const track = document.getElementById('sliderTrack');
    const dotsEl = document.getElementById('sliderDots');
    const prevBtn = document.getElementById('sliderPrev');
    const nextBtn = document.getElementById('sliderNext');
    if (!track) return;
  
    const slides = track.querySelectorAll('.testimonial-card');
    const total = slides.length;
    const visible = 3;
    const steps = total - visible;
    let cur = 0;
  
    for (let i = 0; i <= steps; i++) {
      const d = document.createElement('button');
      d.className = 'slider-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', 'Leht ' + (i + 1));
      d.onclick = () => go(i);
      dotsEl.appendChild(d);
    }
  
    function go(n) {
      cur = Math.max(0, Math.min(n, steps));
      const slideW = slides[0].offsetWidth + 24;
      track.style.transform = `translateX(-${cur * slideW}px)`;
      dotsEl.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === cur));
      prevBtn.disabled = cur === 0;
      nextBtn.disabled = cur === steps;
    }
  
    prevBtn.onclick = () => go(cur - 1);
    nextBtn.onclick = () => go(cur + 1);
    window.addEventListener('resize', () => go(cur));
  })();