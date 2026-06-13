const attendance = JSON.parse(document.querySelector('#hidden').innerText)
const filterSelect = document.getElementById('consistency-filter')
const chartCanvas = document.getElementById('attendance-chart')
const studentsList = document.getElementById('students-list')
const datesSelectELe = document.querySelector('#dates')

let attendanceChart = null

// --- Tab switching ---
function toggleTabs(title) {
    const registerTab = document.querySelector('#reg-tab')
    const markedTab = document.querySelector('#marked-tab')
    if (title === 'Marked') {
        registerTab.classList.add('display-none')
        markedTab.classList.remove('display-none')
    } else if (title === 'Registered') {
        markedTab.classList.add('display-none')
        registerTab.classList.remove('display-none')
    }
}

document.querySelector('.top-bar').addEventListener('click', function (event) {
    const clicked_btn = event.target.closest('button')
    if (!clicked_btn) return
    const other_btn = document.querySelector('button.active')
    other_btn.classList.remove('active')
    clicked_btn.classList.add('active')
    toggleTabs(clicked_btn.innerText)
})

// --- Per-student stats ---
const totalDays = Object.keys(attendance).length
const perStudent = {}

document.querySelectorAll('#reg-tab .student-info').forEach(card => {
    const matric = card.dataset.matric
    const name = card.querySelector('.texts p:first-child').innerText.replace('Name: ', '').trim()
    perStudent[matric] = { name, matric, count: 0 }
})

Object.entries(attendance).forEach(([, students]) => {
    students.forEach(s => {
        if (perStudent[s.matric_no]) {
            perStudent[s.matric_no].count++
        }
    })
})

function getLevel(pct) {
    if (pct >= 70) return 'high'
    if (pct >= 40) return 'moderate'
    if (pct > 0) return 'low'
    return 'never'
}

function getLabel(pct, count) {
    if (pct >= 70) return 'Consistent'
    if (pct >= 40) return 'Moderate'
    if (count > 0) return 'Low'
    return 'Never'
}

function getColor(pct, count) {
    if (pct >= 70) return '#2e7d32'
    if (pct >= 40) return '#f9a825'
    if (count > 0) return '#e65100'
    return '#bdbdbd'
}

document.querySelectorAll('#reg-tab .student-info').forEach(card => {
    const matric = card.dataset.matric
    const data = perStudent[matric]
    if (!data) return

    const pct = totalDays > 0 ? Math.round((data.count / totalDays) * 100) : 0
    card.querySelector('.times-attended p').textContent = `Times attended: ${data.count}`
    card.querySelector('.consistency-pct').textContent = pct + '%'
    card.querySelector('.consistency-label').textContent = getLabel(pct, data.count)
    card.querySelector('.status').style.background = getColor(pct, data.count)
})

// --- Filter ---
function applyFilter() {
    const value = filterSelect.value

    document.querySelectorAll('#reg-tab .student-info').forEach(card => {
        const data = perStudent[card.dataset.matric]
        if (!data) return
        const pct = totalDays > 0 ? Math.round((data.count / totalDays) * 100) : 0
        const level = getLevel(pct)
        card.classList.toggle('filtered-out', !(value === 'all' || level === value))
    })

    updateChart(value)
}

filterSelect.addEventListener('change', applyFilter)

// --- Chart ---
function updateChart(filterValue) {
    let students = Object.values(perStudent)
        .filter(() => totalDays > 0)
        .map(s => ({ ...s, pct: Math.round((s.count / totalDays) * 100) }))
        .map(s => ({ ...s, level: getLevel(s.pct) }))
        .filter(s => filterValue === 'all' || s.level === filterValue)
        .sort((a, b) => b.count - a.count)

    const wrapper = document.querySelector('.chart-wrapper')
    if (students.length === 0 || totalDays === 0) {
        wrapper.style.display = 'none'
        return
    }
    wrapper.style.display = 'block'

    if (attendanceChart) attendanceChart.destroy()

    attendanceChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: students.map(s => s.name),
            datasets: [{
                label: 'Times Attended',
                data: students.map(s => s.count),
                backgroundColor: students.map(s => getColor(s.pct, s.count)),
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    })
}

// --- Marked tab (existing) ---
function populateDates() {
    const dates = Object.keys(attendance)
    let optionsEle = ''
    dates.forEach(date => {
        optionsEle += `<option value=${date}> ${date} </option>`
    })
    datesSelectELe.innerHTML = optionsEle
    if (dates.length > 0) displayDateData(dates[0])
}

function displayDateData(event) {
    const date = typeof event === 'string' ? event : event.target.value
    let studentsHTML = ''
    const studentsDataList = attendance[date]
    if (!studentsDataList) return
    studentsDataList.forEach(each_student => {
        studentsHTML += `
        <div class="student-info">
            <img src="../imgs/user.jpg">
            <div class="student-data">
                <div class="texts">
                    <p>Name: ${each_student.name} &nbsp;</p>
                    <p>Matric No: ${each_student.matric_no}</p>
                </div>
                <div class="times-attended"><p>Present</p></div>
            </div>
            <div class="status"><p>P</p><p>Present</p></div>
        </div>`
    })
    document.querySelector('#some-date-data').innerHTML = studentsHTML
}

if (datesSelectELe) {
    populateDates()
    datesSelectELe.addEventListener('change', displayDateData)
}

applyFilter()
