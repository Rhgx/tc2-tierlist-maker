/**
 * GSAP Animations Module
 */

class Animations {
    constructor() {
        this.gsap = window.gsap;
        if (!this.gsap) {
            console.warn('GSAP not loaded');
        }
    }
    
    /**
     * Animate menu on initial load
     */
    animateMenu() {
        if (!this.gsap) return;
        
        const title = document.querySelector('.menu__title');
        const subtitle = document.querySelector('.menu__subtitle');
        const buttons = document.querySelectorAll('.menu__btn');
        
        this.gsap.fromTo(title, 
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'power1.out' }
        );
        
        this.gsap.fromTo(subtitle,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, delay: 0.1, ease: 'power1.out' }
        );
        
        this.gsap.fromTo(buttons,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, delay: 0.2, ease: 'power1.out' }
        );
    }
    
    /**
     * Transition from menu to tierlist view
     */
    transitionToTierlist() {
        if (!this.gsap) {
            document.getElementById('menu-view').classList.remove('view--active');
            document.getElementById('tierlist-view').classList.add('view--active');
            return;
        }
        
        const menuView = document.getElementById('menu-view');
        const tierlistView = document.getElementById('tierlist-view');
        
        // Fade out menu
        this.gsap.to(menuView, {
            opacity: 0,
            duration: 0.2,
            ease: 'power1.out',
            onComplete: () => {
                menuView.classList.remove('view--active');
                menuView.style.opacity = 1;
                
                // Show tierlist view
                tierlistView.classList.add('view--active');
                
                // Animate tierlist in
                this.animateTierlistIn(tierlistView);
            }
        });
    }
    
    /**
     * Animate tier rows and pool into view
     */
    animateTierlistIn(tierlistView) {
        const tierRows = tierlistView.querySelectorAll('.tier-row');
        const pool = tierlistView.querySelector('.pool-container');
        
        this.gsap.fromTo(tierRows,
            { opacity: 0, x: 30 },
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }
        );
        
        this.gsap.fromTo(pool,
            { opacity: 0 },
            { opacity: 1, duration: 0.4, delay: 0.4, ease: 'power2.out' }
        );
    }
    
    /**
     * Animate reset: fade out current state, run reset, fade in new state
     */
    animateReset(onReset) {
        if (!this.gsap) {
            onReset();
            return;
        }
        
        const tierlistView = document.getElementById('tierlist-view');
        const tierRows = tierlistView.querySelectorAll('.tier-row');
        const pool = tierlistView.querySelector('.pool-container');
        
        // Fade out current state
        this.gsap.to([tierRows, pool], {
            opacity: 0,
            duration: 0.25,
            ease: 'power1.in',
            onComplete: () => {
                // Run reset logic
                onReset();
                
                // Animate back in
                this.animateTierlistIn(tierlistView);
            }
        });
    }
    
    /**
     * Transition from tierlist view back to menu
     */
    transitionToMenu() {
        if (!this.gsap) {
            document.getElementById('tierlist-view').classList.remove('view--active');
            document.getElementById('menu-view').classList.add('view--active');
            return;
        }
        
        const menuView = document.getElementById('menu-view');
        const tierlistView = document.getElementById('tierlist-view');
        
        // Fade out tierlist
        this.gsap.to(tierlistView, {
            opacity: 0,
            duration: 0.2,
            ease: 'power1.out',
            onComplete: () => {
                tierlistView.classList.remove('view--active');
                tierlistView.style.opacity = 1;
                
                // Show menu view
                menuView.classList.add('view--active');
                
                // Animate menu back in
                this.animateMenu();
            }
        });
    }
    
    /**
     * Transition from menu to folder view
     */
    transitionToFolder() {
        if (!this.gsap) {
            document.getElementById('menu-view').classList.remove('view--active');
            document.getElementById('folder-view').classList.add('view--active');
            return;
        }
        
        const menuView = document.getElementById('menu-view');
        const folderView = document.getElementById('folder-view');
        
        // Fade out menu
        this.gsap.to(menuView, {
            opacity: 0,
            duration: 0.2,
            ease: 'power1.out',
            onComplete: () => {
                menuView.classList.remove('view--active');
                menuView.style.opacity = 1;
                
                // Show folder view
                folderView.classList.add('view--active');
                
                // Animate folder in
                this.animateFolderIn(folderView);
            }
        });
    }
    
    /**
     * Animate folder view elements into view
     */
    animateFolderIn(folderView) {
        const title = folderView.querySelector('.menu__title');
        const subtitle = folderView.querySelector('.menu__subtitle');
        const buttons = folderView.querySelectorAll('.menu__btn:not(.menu__btn--back)');
        const backBtn = folderView.querySelector('.menu__btn--back');
        
        this.gsap.fromTo(backBtn,
            { opacity: 0, x: -20 },
            { opacity: 1, x: 0, duration: 0.3, ease: 'power1.out' }
        );
        
        this.gsap.fromTo(title, 
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'power1.out' }
        );
        
        this.gsap.fromTo(subtitle,
            { opacity: 0 },
            { opacity: 1, duration: 0.3, delay: 0.1, ease: 'power1.out' }
        );
        
        this.gsap.fromTo(buttons,
            { opacity: 0, x: 30 },
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.06, delay: 0.15, ease: 'power2.out' }
        );
    }
    
    /**
     * Transition from folder view back to menu
     */
    transitionFromFolder() {
        if (!this.gsap) {
            document.getElementById('folder-view').classList.remove('view--active');
            document.getElementById('menu-view').classList.add('view--active');
            return;
        }
        
        const menuView = document.getElementById('menu-view');
        const folderView = document.getElementById('folder-view');
        
        // Fade out folder
        this.gsap.to(folderView, {
            opacity: 0,
            duration: 0.2,
            ease: 'power1.out',
            onComplete: () => {
                folderView.classList.remove('view--active');
                folderView.style.opacity = 1;
                
                // Show menu view
                menuView.classList.add('view--active');
                
                // Animate menu back in
                this.animateMenu();
            }
        });
    }
    
    /**
     * Transition from folder view to tierlist view
     */
    transitionFromFolderToTierlist() {
        if (!this.gsap) {
            document.getElementById('folder-view').classList.remove('view--active');
            document.getElementById('tierlist-view').classList.add('view--active');
            return;
        }
        
        const folderView = document.getElementById('folder-view');
        const tierlistView = document.getElementById('tierlist-view');
        
        // Fade out folder
        this.gsap.to(folderView, {
            opacity: 0,
            duration: 0.2,
            ease: 'power1.out',
            onComplete: () => {
                folderView.classList.remove('view--active');
                folderView.style.opacity = 1;
                
                // Show tierlist view
                tierlistView.classList.add('view--active');
                
                // Animate tierlist in
                this.animateTierlistIn(tierlistView);
            }
        });
    }
    
    /**
     * Transition from tierlist view back to folder view
     */
    transitionToFolderFromTierlist() {
        if (!this.gsap) {
            document.getElementById('tierlist-view').classList.remove('view--active');
            document.getElementById('folder-view').classList.add('view--active');
            return;
        }
        
        const folderView = document.getElementById('folder-view');
        const tierlistView = document.getElementById('tierlist-view');
        
        // Fade out tierlist
        this.gsap.to(tierlistView, {
            opacity: 0,
            duration: 0.2,
            ease: 'power1.out',
            onComplete: () => {
                tierlistView.classList.remove('view--active');
                tierlistView.style.opacity = 1;
                
                // Show folder view
                folderView.classList.add('view--active');
                
                // Animate folder back in
                this.animateFolderIn(folderView);
            }
        });
    }
}

export { Animations };
