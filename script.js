// Supabase initialization
const supabaseUrl = 'https://wixnfcreayoyyaadjjlz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeG5mY3JlYXlveXlhYWRqamx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NTAyNjEsImV4cCI6MjA2ODQyNjI2MX0.d0D3eZXSe6PA31fd5mLtpJtrJj84baFhIQVvE-dt7uw';
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin password (better to store in Supabase table in production)
const ADMIN_PASSWORD = 'admin123';

// ================== USER MANAGEMENT ================== //

async function getUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data;
}

async function saveUser(user) {
  const { data, error } = await supabase.from('users').insert([user]);
  if (error) {
    console.error('Error saving user:', error);
    throw error;
  }
  return data;
}

async function deleteUser(userId) {
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// ================== NEWS MANAGEMENT ================== //

async function getNews() {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('date_posted', { ascending: false });
  if (error) {
    console.error('Error fetching news:', error);
    return [];
  }
  return data;
}

async function saveNews(newsItem) {
  const { data, error } = await supabase.from('news').insert([newsItem]);
  if (error) {
    console.error('Error saving news:', error);
    throw error;
  }
  return data;
}

async function deleteNews(newsId) {
  const { error } = await supabase.from('news').delete().eq('id', newsId);
  if (error) {
    console.error('Error deleting news:', error);
    throw error;
  }
}

// ================== ATTENDANCE MANAGEMENT ================== //

async function getAttendance(date) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('date', date);
  
  if (error) {
    console.error('Error fetching attendance:', error);
    return {};
  }
  
  return data.reduce((acc, item) => {
    acc[item.user_id] = {
      present: item.present,
      timeIn: item.time_in,
      timeOut: item.time_out
    };
    return acc;
  }, {});
}

async function saveAttendance(date, attendanceData) {
  // Delete existing records for the date
  await supabase.from('attendance').delete().eq('date', date);
  
  // Prepare data for bulk insert
  const records = Object.entries(attendanceData).map(([userId, data]) => ({
    user_id: userId,
    date: date,
    present: data.present,
    time_in: data.timeIn,
    time_out: data.timeOut
  }));
  
  // Insert new records
  const { error } = await supabase.from('attendance').insert(records);
  if (error) throw error;
}

// ================== FEES MANAGEMENT ================== //

async function getFees() {
  const { data, error } = await supabase.from('fees').select('*');
  if (error) {
    console.error('Error fetching fees:', error);
    return [];
  }
  return data;
}

async function saveFee(fee) {
  const { data, error } = await supabase.from('fees').insert([fee]);
  if (error) {
    console.error('Error saving fee:', error);
    throw error;
  }
  return data;
}

async function deleteFee(feeId) {
  const { error } = await supabase.from('fees').delete().eq('id', feeId);
  if (error) {
    console.error('Error deleting fee:', error);
    throw error;
  }
}

// ================== ADMIN FUNCTIONS ================== //

async function loginAdmin() {
  const password = document.getElementById('adminPassword')?.value;
  const loginError = document.getElementById('loginError');
  if (!password || !loginError) return;
  
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem('isAdminLoggedIn', 'true');
    window.location.href = 'admin.html';
  } else {
    loginError.textContent = 'Invalid password!';
    loginError.style.display = 'block';
  }
}

function logoutAdmin() {
  localStorage.setItem('isAdminLoggedIn', 'false');
  window.location.href = 'index.html';
}

// ================== UI FUNCTIONS ================== //

async function fetchNews() {
  const newsList = document.getElementById('newsList');
  if (!newsList) return;
  
  newsList.innerHTML = '';
  const news = await getNews();
  
  if (news.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No news updates available.';
    newsList.appendChild(li);
  } else {
    news.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${new Date(item.date_posted).toLocaleDateString()} - ${item.content}`;
      newsList.appendChild(li);
    });
    
    // Calculate ticker animation duration
    const contentWidth = newsList.scrollWidth;
    const containerWidth = document.querySelector('.news-ticker-container').offsetWidth;
    const duration = Math.max(30, contentWidth / 50);
    
    const ticker = document.querySelector('.news-ticker');
    ticker.style.animation = `ticker ${duration}s linear infinite`;
  }
}

async function fetchUsers() {
  const userTable = document.getElementById('userTable')?.querySelector('tbody');
  const totalUsers = document.getElementById('totalUsers');
  if (!userTable || !totalUsers) return;
  
  userTable.innerHTML = '';
  const users = await getUsers();
  const fees = await getFees();
  totalUsers.textContent = users.length;
  
  if (users.length === 0) {
    const row = userTable.insertRow();
    row.innerHTML = `<td colspan="7" style="text-align: center;">No students registered.</td>`;
  } else {
    users.forEach(user => {
      const row = userTable.insertRow();
      const userFees = fees.filter(fee => fee.user_id === user.id);
      const hasPaid = userFees.length > 0;
      const totalPaid = userFees.reduce((sum, fee) => sum + fee.amount, 0);
      
      row.innerHTML = `
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.phone}</td>
        <td>${user.address}</td>
        <td>${new Date(user.registration_date).toLocaleDateString()}</td>
        <td class="fee-status ${hasPaid ? 'paid' : 'unpaid'}">
          ${hasPaid ? `Paid (₹${totalPaid})` : 'Unpaid'}
        </td>
        <td><a href="#" onclick="deleteUser('${user.id}')">Delete</a></td>
      `;
    });
  }
}

async function loadAttendance() {
  const dateInput = document.getElementById('attendanceDate');
  let selectedDate = dateInput.value;
  
  if (!selectedDate) {
    const today = new Date();
    selectedDate = today.toISOString().split('T')[0];
    dateInput.value = selectedDate;
  }
  
  document.getElementById('currentDateDisplay').textContent = formatDisplayDate(selectedDate);
  
  const attendanceTable = document.getElementById('attendanceTable').querySelector('tbody');
  attendanceTable.innerHTML = '';
  
  const users = await getUsers();
  const dateAttendance = await getAttendance(selectedDate);
  
  users.forEach(user => {
    const row = attendanceTable.insertRow();
    const userAttendance = dateAttendance[user.id] || {
      present: false,
      timeIn: '09:00',
      timeOut: '18:00'
    };
    
    const timeIn12h = convertTo12Hour(userAttendance.timeIn);
    const timeOut12h = convertTo12Hour(userAttendance.timeOut);
    
    row.innerHTML = `
      <td>${user.name}</td>
      <td>
        <input type="checkbox" class="present-checkbox"
               ${userAttendance.present ? 'checked' : ''}
               data-user-id="${user.id}">
      </td>
      <td>
        <input type="time" class="time-in" 
               value="${userAttendance.timeIn}"
               data-user-id="${user.id}">
        <span class="time-display">${timeIn12h}</span>
      </td>
      <td>
        <input type="time" class="time-out" 
               value="${userAttendance.timeOut}"
               data-user-id="${user.id}">
        <span class="time-display">${timeOut12h}</span>
      </td>
    `;
  });
  
  // Add event listeners to time inputs
  document.querySelectorAll('.time-in, .time-out').forEach(input => {
    input.addEventListener('change', function() {
      const userId = this.getAttribute('data-user-id');
      const timeDisplay = this.nextElementSibling;
      timeDisplay.textContent = convertTo12Hour(this.value);
    });
  });
}

async function saveAttendance() {
  const date = document.getElementById('attendanceDate').value;
  if (!date) {
    alert('Please select a date first');
    return;
  }
  
  const attendanceData = {};
  const rows = document.querySelectorAll('#attendanceTable tbody tr');
  
  rows.forEach(row => {
    const userId = row.querySelector('.present-checkbox').getAttribute('data-user-id');
    const present = row.querySelector('.present-checkbox').checked;
    const timeIn = row.querySelector('.time-in').value;
    const timeOut = row.querySelector('.time-out').value;
    
    attendanceData[userId] = { present, timeIn, timeOut };
  });
  
  try {
    await saveAttendance(date, attendanceData);
    alert('Attendance saved successfully!');
  } catch (error) {
    alert('Error saving attendance: ' + error.message);
  }
}

function markAllPresent() {
  const checkboxes = document.querySelectorAll('.present-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
}

async function fetchAdminNews() {
  const newsTable = document.getElementById('newsTable')?.querySelector('tbody');
  if (!newsTable) return;
  
  newsTable.innerHTML = '';
  const news = await getNews();
  
  if (news.length === 0) {
    const row = newsTable.insertRow();
    row.innerHTML = `<td colspan="3" style="text-align: center;">No news updates available.</td>`;
  } else {
    news.forEach(item => {
      const row = newsTable.insertRow();
      row.innerHTML = `
        <td>${new Date(item.date_posted).toLocaleDateString()}</td>
        <td>${item.content}</td>
        <td><a href="#" onclick="deleteNews('${item.id}')">Delete</a></td>
      `;
    });
  }
}

async function fetchFees() {
  const feeTable = document.getElementById('feeTable')?.querySelector('tbody');
  const feeForm = document.getElementById('feeForm');
  const studentSelect = feeForm?.querySelector('select[name="student_id"]');
  
  if (!feeTable || !feeForm || !studentSelect) return;
  
  feeTable.innerHTML = '';
  const fees = await getFees();
  const users = await getUsers();
  
  // Populate student dropdown
  studentSelect.innerHTML = '<option value="">Select Student</option>';
  users.forEach(user => {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = `${user.name} (${user.phone})`;
    studentSelect.appendChild(option);
  });
  
  if (fees.length === 0) {
    const row = feeTable.insertRow();
    row.innerHTML = `<td colspan="4" style="text-align: center;">No fee records available.</td>`;
  } else {
    fees.forEach(fee => {
      const user = users.find(u => u.id === fee.user_id);
      const row = feeTable.insertRow();
      row.innerHTML = `
        <td>${user ? user.name : 'Unknown Student'}</td>
        <td>₹${fee.amount}</td>
        <td>${fee.payment_date}</td>
        <td><a href="#" onclick="deleteFee('${fee.id}')">Delete</a></td>
      `;
    });
  }
}

// ================== FORM HANDLERS ================== //

function handleContactForm() {
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      
      const user = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        registration_date: new Date().toISOString()
      };
      
      try {
        await saveUser(user);
        this.reset();
        showSuccessMessage('Registration successful!');
        await fetchUsers();
      } catch (error) {
        showErrorMessage('Error saving user: ' + error.message);
      }
    });
  }
}

function handleNewsForm() {
  const newsForm = document.getElementById('newsForm');
  if (newsForm) {
    newsForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const newsContent = formData.get('news_content').trim();
      
      if (!newsContent) {
        alert('Please enter news content!');
        return;
      }

      const newsItem = {
        content: newsContent,
        date_posted: new Date().toISOString()
      };
      
      try {
        await saveNews(newsItem);
        this.reset();
        showSuccessMessage('News added successfully!');
        await fetchNews();
        await fetchAdminNews();
      } catch (error) {
        showErrorMessage('Error adding news: ' + error.message);
      }
    });
  }
}

function handleFeeForm() {
  const feeForm = document.getElementById('feeForm');
  if (feeForm) {
    feeForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      
      const fee = {
        student_id: formData.get('student_id'),
        amount: parseInt(formData.get('amount')),
        payment_date: formData.get('payment_date')
      };
      
      try {
        await saveFee(fee);
        this.reset();
        showSuccessMessage('Fee added successfully!');
        await fetchFees();
        await fetchUsers(); // Refresh user list to update fee status
      } catch (error) {
        showErrorMessage('Error adding fee: ' + error.message);
      }
    });
  }
}

// ================== UTILITY FUNCTIONS ================== //

function formatDisplayDate(dateString) {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function convertTo12Hour(time24h) {
  if (!time24h) return '';
  const [hours, minutes] = time24h.split(':');
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

function showSuccessMessage(message) {
  const successMsg = document.createElement('div');
  successMsg.textContent = message;
  successMsg.style.position = 'fixed';
  successMsg.style.bottom = '20px';
  successMsg.style.right = '20px';
  successMsg.style.padding = '10px 20px';
  successMsg.style.backgroundColor = '#10b981';
  successMsg.style.color = 'white';
  successMsg.style.borderRadius = '5px';
  successMsg.style.zIndex = '1000';
  successMsg.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  document.body.appendChild(successMsg);
  
  setTimeout(() => {
    successMsg.style.opacity = '0';
    setTimeout(() => document.body.removeChild(successMsg), 500);
  }, 3000);
}

function showErrorMessage(message) {
  const errorMsg = document.createElement('div');
  errorMsg.textContent = message;
  errorMsg.style.position = 'fixed';
  errorMsg.style.bottom = '20px';
  errorMsg.style.right = '20px';
  errorMsg.style.padding = '10px 20px';
  errorMsg.style.backgroundColor = '#ef4444';
  errorMsg.style.color = 'white';
  errorMsg.style.borderRadius = '5px';
  errorMsg.style.zIndex = '1000';
  successMsg.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  document.body.appendChild(errorMsg);
  
  setTimeout(() => {
    errorMsg.style.opacity = '0';
    setTimeout(() => document.body.removeChild(errorMsg), 500);
  }, 3000);
}

function searchResources() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  
  const searchValue = searchInput.value.toLowerCase();
  const sections = document.querySelectorAll('section');
  let found = false;

  sections.forEach(section => {
    if (section.id !== 'contact' && section.id !== 'admin-login') {
      const text = section.textContent.toLowerCase();
      section.style.display = text.includes(searchValue) ? 'block' : 'none';
      if (text.includes(searchValue)) found = true;
    }
  });

  if (!found) {
    alert('No results found for "' + searchValue + '".');
  }
  document.querySelector('#home').style.display = 'block';
}

function toggleMenu() {
  const navMenu = document.querySelector('.nav-menu');
  navMenu.classList.toggle('active');
}

// ================== INITIALIZATION ================== //

document.addEventListener('DOMContentLoaded', () => {
  fetchNews();
  fetchUsers();
  handleContactForm();
  handleNewsForm();
  handleFeeForm();

  // Check admin login for admin.html
  if (window.location.pathname.includes('admin.html') && localStorage.getItem('isAdminLoggedIn') !== 'true') {
    window.location.href = 'index.html';
  } else if (window.location.pathname.includes('admin.html')) {
    fetchAdminNews();
    fetchFees();
    loadAttendance();
  }

  // Admin link click handler
  const adminLink = document.getElementById('adminLink');
  if (adminLink) {
    adminLink.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelectorAll('section').forEach(section => {
        section.style.display = section.id === 'admin-login' ? 'block' : 'none';
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Mobile menu toggle
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('nav ul');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('show');
    });
  }

  // Smooth scrolling
  document.querySelectorAll('nav ul li a:not(.logout)').forEach(anchor => {
    if (anchor.getAttribute('href').startsWith('#')) {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: 'smooth'
          });
        }
        if (navMenu.classList.contains('show')) {
          navMenu.classList.remove('show');
        }
      });
    }
  });
});