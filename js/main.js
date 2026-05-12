document.addEventListener('DOMContentLoaded', () => {

    // Notice the updated path: 'components/header.html'
    fetch('components/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading the header:', error));

});