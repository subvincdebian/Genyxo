     window.onload = function() {
            setTimeout(function() {
                window.scrollTo(0, 0);
            }, 10); 
        };

        function toggleMobileMenu() {
            const sidebar = document.getElementById('mobileSidebar');
            const overlay = document.getElementById('overlay');
            
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeMenu() {
            const sidebar = document.getElementById('mobileSidebar');
            const overlay = document.getElementById('overlay');
            
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        document.getElementById('overlay').addEventListener('click', closeMenu);

        document.addEventListener('click', function(event) {
            const sidebar = document.getElementById('mobileSidebar');
            const overlay = document.getElementById('overlay');
            const burger = document.getElementById('toggleMobileMenu');
            
            if (sidebar.classList.contains('active') && overlay.classList.contains('active')) {
                if (!sidebar.contains(event.target) && !burger.contains(event.target)) {
                    closeMenu();
                }
            }
        });