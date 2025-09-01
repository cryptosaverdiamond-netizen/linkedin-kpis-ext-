// SCRIPT DE MISE À JOUR DES SÉLECTEURS
// Met à jour automatiquement les fichiers selectors/ avec les vrais sélecteurs trouvés

function updateSelectorFiles() {
    console.log('🔄 MISE À JOUR DES FICHIERS SELECTORS...');
    
    // Vérifier que les données sont disponibles
    if (!window.dashboardSelectors && !window.postsSelectors) {
        console.log('❌ Aucune donnée trouvée. Exécutez d\'abord linkedin-selector-finder.js');
        return;
    }
    
    const files = [];
    
    // Dashboard
    if (window.dashboardSelectors) {
        files.push({
            name: 'selectors/dashboard.fr.json',
            content: JSON.stringify(window.dashboardSelectors, null, 2)
        });
    }
    
    // Posts  
    if (window.postsSelectors) {
        files.push({
            name: 'selectors/posts.fr.json', 
            content: JSON.stringify(window.postsSelectors, null, 2)
        });
    }
    
    // Afficher les fichiers à créer
    console.log(`\n📁 ${files.length} fichiers à mettre à jour:`);
    
    files.forEach(file => {
        console.log(`\n=== ${file.name} ===`);
        console.log(file.content);
        console.log('='.repeat(50));
    });
    
    // Instructions pour la mise à jour manuelle
    console.log('\n📝 INSTRUCTIONS DE MISE À JOUR:');
    console.log('1. Copiez le contenu de chaque fichier ci-dessus');
    console.log('2. Remplacez le contenu des fichiers correspondants dans votre extension');
    console.log('3. Rechargez l\'extension dans Chrome');
    console.log('4. Testez sur LinkedIn');
    
    // Sauvegarder pour copie facile
    window.selectorFiles = files;
    
    console.log('\n💾 Fichiers sauvegardés dans window.selectorFiles');
    console.log('📋 Pour copier un fichier: copy(window.selectorFiles[0].content)');
    
    return files;
}

// Auto-exécution si les données sont disponibles
if (window.dashboardSelectors || window.postsSelectors) {
    updateSelectorFiles();
} else {
    console.log('⏳ En attente des données de linkedin-selector-finder.js...');
    
    // Attendre que les données soient disponibles
    const checkInterval = setInterval(() => {
        if (window.dashboardSelectors || window.postsSelectors) {
            clearInterval(checkInterval);
            updateSelectorFiles();
        }
    }, 1000);
    
    // Timeout après 10 secondes
    setTimeout(() => {
        clearInterval(checkInterval);
        console.log('❌ Timeout: Exécutez d\'abord linkedin-selector-finder.js');
    }, 10000);
}

// Export
window.updateSelectorFiles = updateSelectorFiles;