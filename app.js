document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const fileSelect = document.getElementById('fileSelect');
    const statusElement = document.getElementById('status');

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    // Remove highlight when item is dragged away
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);

    // Handle file selection via the button
    fileSelect.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFiles, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({target: {files: files}});
    }

    function handleFiles(e) {
        const files = e.target.files;
        if (files.length) {
            processFile(files[0]);
        }
    }

    function processFile(file) {
        // Check if file is JSON
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            updateStatus('Error: Please upload a JSON file', 'error');
            return;
        }

        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Try to parse the JSON
                const jsonData = JSON.parse(e.target.result);
                
                // Show success message
                updateStatus('Success: JSON file loaded', 'success');
                
                // Log to console
                console.log('FILE loaded');
                
                // You can do more with the JSON data here if needed
                // console.log(jsonData);
            } catch (error) {
                updateStatus('Error: Invalid JSON format', 'error');
                console.error('Error parsing JSON:', error);
            }
        };
        
        reader.onerror = function() {
            updateStatus('Error: Failed to read file', 'error');
            console.error('Error reading file');
        };
        
        reader.readAsText(file);
    }

    function updateStatus(message, type) {
        statusElement.textContent = message;
        statusElement.className = type;
    }
});