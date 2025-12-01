const API_BASE_URL = 'http://localhost:3000/api';

let currentDeleteId = null;
let allStudents = [];

// Load students on page load
document.addEventListener('DOMContentLoaded', () => {
    loadStudents();
});

// Load all students
async function loadStudents() {
    try {
        const response = await fetch(`${API_BASE_URL}/students`);
        if (!response.ok) throw new Error('Failed to load students');
        
        allStudents = await response.json();
        displayStudents(allStudents);
    } catch (error) {
        let errorMsg = 'Error loading students: ' + error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg = 'Cannot connect to server. Please make sure the server is running on http://localhost:3000';
        }
        showMessage(errorMsg, 'error');
        document.getElementById('studentsTableBody').innerHTML = 
            `<tr><td colspan="6" class="empty-state">${errorMsg}<br><br>Make sure to run: <code>npm start</code> in the terminal</td></tr>`;
    }
}

// Display students in table
function displayStudents(students) {
    const tbody = document.getElementById('studentsTableBody');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No students found</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.id}</td>
            <td>${student.student_name}</td>
            <td>${student.roll_no}</td>
            <td>₹${parseFloat(student.fees).toFixed(2)}</td>
            <td>${student.mobile_no}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit" onclick="editStudent(${student.id})">Edit</button>
                    <button class="btn btn-delete" onclick="deleteStudent(${student.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Open add modal
function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add New Student';
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    document.getElementById('studentModal').style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('studentModal').style.display = 'none';
    document.getElementById('studentForm').reset();
}

// Handle form submit
async function handleSubmit(event) {
    event.preventDefault();
    
    const id = document.getElementById('studentId').value;
    const studentData = {
        student_name: document.getElementById('studentName').value.trim(),
        roll_no: document.getElementById('rollNo').value.trim(),
        fees: parseFloat(document.getElementById('fees').value),
        mobile_no: document.getElementById('mobileNo').value.trim()
    };

    try {
        const url = id ? `${API_BASE_URL}/students/${id}` : `${API_BASE_URL}/students`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Operation failed');
        }

        showMessage(id ? 'Student updated successfully!' : 'Student added successfully!', 'success');
        closeModal();
        loadStudents();
    } catch (error) {
        let errorMsg = 'Error: ' + error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg = 'Cannot connect to server. Please make sure the server is running.';
        }
        showMessage(errorMsg, 'error');
    }
}

// Edit student
async function editStudent(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/${id}`);
        if (!response.ok) throw new Error('Failed to load student');
        
        const student = await response.json();
        
        document.getElementById('modalTitle').textContent = 'Edit Student';
        document.getElementById('studentId').value = student.id;
        document.getElementById('studentName').value = student.student_name;
        document.getElementById('rollNo').value = student.roll_no;
        document.getElementById('fees').value = student.fees;
        document.getElementById('mobileNo').value = student.mobile_no;
        
        document.getElementById('studentModal').style.display = 'block';
    } catch (error) {
        let errorMsg = 'Error loading student: ' + error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg = 'Cannot connect to server. Please make sure the server is running.';
        }
        showMessage(errorMsg, 'error');
    }
}

// Delete student
function deleteStudent(id) {
    currentDeleteId = id;
    document.getElementById('deleteModal').style.display = 'block';
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    currentDeleteId = null;
}

// Open Pay Now QR modal
function openQrModal() {
    document.getElementById('qrModal').style.display = 'block';
}

// Close Pay Now QR modal
function closeQrModal() {
    document.getElementById('qrModal').style.display = 'none';
}

// Confirm delete
async function confirmDelete() {
    if (!currentDeleteId) return;

    try {
        const response = await fetch(`${API_BASE_URL}/students/${currentDeleteId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Delete failed');
        }

        showMessage('Student deleted successfully!', 'success');
        closeDeleteModal();
        loadStudents();
    } catch (error) {
        let errorMsg = 'Error: ' + error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg = 'Cannot connect to server. Please make sure the server is running.';
        }
        showMessage(errorMsg, 'error');
    }
}

// Search functionality
function handleSearch(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        loadStudents();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/students/search/${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Search failed');
        
        const students = await response.json();
        displayStudents(students);
    } catch (error) {
        let errorMsg = 'Error searching: ' + error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg = 'Cannot connect to server. Please make sure the server is running.';
        }
        showMessage(errorMsg, 'error');
    }
}

// Export to Excel
async function exportToExcel() {
    try {
        const response = await fetch(`${API_BASE_URL}/students/export/excel`);
        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showMessage('Excel report exported successfully!', 'success');
    } catch (error) {
        let errorMsg = 'Error exporting: ' + error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg = 'Cannot connect to server. Please make sure the server is running.';
        }
        showMessage(errorMsg, 'error');
    }
}

// Show message
function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.animation = 'slideInRight 0.3s reverse';
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 300);
    }, 3000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const studentModal = document.getElementById('studentModal');
    const deleteModal = document.getElementById('deleteModal');
    const qrModal = document.getElementById('qrModal');
    
    if (event.target === studentModal) {
        closeModal();
    }
    if (event.target === deleteModal) {
        closeDeleteModal();
    }
    if (event.target === qrModal) {
        closeQrModal();
    }
}

