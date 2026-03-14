/**
 * ============================================================
 * SITEMAP GENERATOR - CORRECTED VERSION
 * Creates and updates sitemap.xml in your GitHub Gist
 * ============================================================
 * 
 * INSTRUCTIONS:
 * 1. Change the CONFIG values below for EACH site
 * 2. Upload this file to your site's root directory
 * 3. Add the script to your admin.html
 * 4. Create sitemap.xml (static file that reads from Gist)
 * ============================================================
 */

// ============================================================
// CONFIGURATION - CHANGE THESE FOR EACH SITE
// ============================================================
const SITE_CONFIG = {
    // YOUR SITE'S DOMAIN (CHANGE THIS!)
    BASE_URL: 'http://wandelweise.schadlab.de',  // <-- CHANGE THIS FOR EACH SITE
    
    // Your site's unique identifier (matches your SITE_NAME constant)
    SITE_ID: 'WandelWeise',  // <-- CHANGE THIS (e.g., 'zeitgeist', 'nordlicht')
    
    // GIST CONFIGURATION (same for all sites)
    GIST_ID: '42ea11087f40fdba423f8eb0f575ac96',
    GIST_OWNER: 'Hamzamain-spec',
    
    // The sitemap file in your Gist - now using SITE_ID to keep them separate in the Gist
    SITEMAP_GIST_FILENAME: 'sitemap_' + 'WandelWeise' + '.xml'
};

// ============================================================
// CORE SITEMAP ENGINE
// ============================================================
(function() {
    if (typeof window === 'undefined') return;
    
    console.log('🗺️ Sitemap Generator loaded for:', SITE_CONFIG.SITE_ID);
    
    // Generate sitemap XML from posts
    function generateSitemapXML(posts) {
        const today = new Date().toISOString().split('T')[0];
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // Static pages
        const staticPages = [
            { url: '', priority: '1.0', changefreq: 'daily' },
            { url: 'index.html', priority: '1.0', changefreq: 'daily' }
        ];
        
        staticPages.forEach(page => {
            const url = SITE_CONFIG.BASE_URL + (page.url ? '/' + page.url : '');
            xml += `  <url>\n`;
            xml += `    <loc>${url}</loc>\n`;
            xml += `    <lastmod>${today}</lastmod>\n`;
            xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
            xml += `    <priority>${page.priority}</priority>\n`;
            xml += `  </url>\n`;
        });
        
        // Article pages
        if (posts && posts.length) {
            posts.forEach(post => {
                if (!post || !post.id) return;
                const postDate = post.date ? new Date(post.date).toISOString().split('T')[0] : today;
                const postUrl = `${SITE_CONFIG.BASE_URL}/post.html?id=${post.id}`;
                
                xml += `  <url>\n`;
                xml += `    <loc>${postUrl}</loc>\n`;
                xml += `    <lastmod>${postDate}</lastmod>\n`;
                xml += `    <changefreq>daily</changefreq>\n`;
                xml += `    <priority>0.7</priority>\n`;
                xml += `  </url>\n`;
            });
        }
        
        xml += '</urlset>';
        return xml;
    }
    
    // Get GitHub token from your existing config
    function getGitHubToken() {
        if (typeof gistConfig !== 'undefined' && gistConfig && gistConfig.token) {
            return gistConfig.token;
        }
        try {
            const configKey = 'gist_config_' + SITE_CONFIG.SITE_ID;
            const saved = localStorage.getItem(configKey);
            if (saved) {
                const config = JSON.parse(saved);
                return config.token;
            }
        } catch (e) {}
        return null;
    }
    
    // Save sitemap to Gist
    async function saveSitemapToGist(xml) {
        const token = getGitHubToken();
        if (!token) {
            console.warn('⚠️ No GitHub token found. Sitemap not saved.');
            return false;
        }
        
        try {
            const gistResponse = await fetch(`https://api.github.com/gists/${SITE_CONFIG.GIST_ID}`, {
                headers: { 'Authorization': `token ${token}` }
            });
            
            if (!gistResponse.ok) return false;
            
            const gistData = await gistResponse.json();
            const currentFile = gistData.files[SITE_CONFIG.SITEMAP_GIST_FILENAME];
            const sha = currentFile ? currentFile.sha : null;
            
            const updateResponse = await fetch(`https://api.github.com/gists/${SITE_CONFIG.GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        [SITE_CONFIG.SITEMAP_GIST_FILENAME]: {
                            content: xml,
                            ...(sha && { sha })
                        }
                    }
                })
            });
            
            if (updateResponse.ok) {
                console.log(`✅ Sitemap saved to Gist as ${SITE_CONFIG.SITEMAP_GIST_FILENAME}`);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Error saving sitemap:', e);
            return false;
        }
    }
    
    // Load posts from Gist
    async function loadPostsForSitemap() {
        try {
            if (typeof getPostsFromGist === 'function') {
                const allPosts = await getPostsFromGist();
                return allPosts.filter(p => p && p.site === SITE_CONFIG.SITE_ID);
            }
            return [];
        } catch (e) {
            return [];
        }
    }
    
    // Main update function
    window.updateSitemap = async function() {
        console.log('🔄 Updating sitemap...');
        const posts = await loadPostsForSitemap();
        const xml = generateSitemapXML(posts);
        return await saveSitemapToGist(xml);
    };
    
    // Hook into existing functions
    function hookIntoExisting() {
        const originalPublish = window.publishPost;
        const originalDelete = window.deletePost;
        
        if (originalPublish) {
            window.publishPost = async function() {
                const result = await originalPublish.apply(this, arguments);
                setTimeout(async () => { await window.updateSitemap(); }, 2000);
                return result;
            };
        }
        
        if (originalDelete) {
            window.deletePost = async function() {
                const result = await originalDelete.apply(this, arguments);
                setTimeout(async () => { await window.updateSitemap(); }, 2000);
                return result;
            };
        }
    }
    
    // Initialize
    window.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            window.updateSitemap();
            hookIntoExisting();
        }, 2000);
    });
})();
