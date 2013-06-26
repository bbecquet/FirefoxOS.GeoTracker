require.config({
    baseUrl: 'js',

    // We fake jquery so that libs that "require" it don't download
    // both jquery and zepto. If you want to use jquery, remove this.
    // Use case: backbone
    map: { '*': { 'jquery': 'zepto' } }
});

require(['app']);
