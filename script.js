const SORTER_API_URL = "https://script.google.com/macros/s/AKfycbyWfDz3H40k9YrDG3sXsjtXWX8-l1i5gp51CnFXDinKPLEzJqKo34NDDuRQvxIcaFbbwQ/exec"
const TEST_API_URL = "https://script.google.com/macros/s/AKfycbwBBpviDWh21a2tBaf1rgV0akY7E94VFGm9dPa4pnuD5ToHQp5Pn8Pa4vcT2_1M-k-7/exec"

//Fetch the questions from the spreadsheet
async function fetchQuestionData() {
    try {
        const response = await fetch(SORTER_API_URL);
        if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json()
        return data.questions
        
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('output').textContent = `Error: ${error.message}`;
    }
}

//Show the questions on the page
async function fillInQuestions() {
    let questions = await fetchQuestionData()
    questions.forEach((q) => {
        const questionDiv = document.createElement("div");
        questionDiv.className = "question";
        questionDiv.innerHTML = `<p>${q.question}</p>`;
        
        q.options.forEach((option) => {
            const label = document.createElement("label");
            label.innerHTML = `
                <input type="radio" id="${q.id}" code="${option.option_code}"> ${option.option_text}
            `;
            questionDiv.appendChild(label);
        });
    
        surveyDiv.appendChild(questionDiv);
    });
}

fillInQuestions()

// Load survey
const surveyDiv = document.getElementById("survey");

//Get the answers the user has selected for each question
function getSelectedAnswers() {
    const selectedAnswers = {};
    const questions = document.querySelectorAll('.question');

    questions.forEach((questionDiv) => {
        const questionId = questionDiv.querySelector('input[type="radio"]').id; // Get the id attribute
        const selectedOption = questionDiv.querySelector('input[type="radio"]:checked'); // Get the selected option
        
        if (selectedOption) {
            const code = selectedOption.getAttribute('code');
            selectedAnswers[questionId] = code; // Save the selected value
        } else {
            selectedAnswers[questionId] = null; // No selection
        }
    });

    return selectedAnswers;
}

async function submitAnswers() {
    selectedAnswers = getSelectedAnswers()
    postArguments = {'selected_answers': selectedAnswers}

    const response = await fetch(SORTER_API_URL, {
        // redirect: "follow",
        method: "POST",
        body: JSON.stringify(postArguments),
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
      });

    const responseData = await response.json(); // Parse the JSON response
    showResults(responseData)
}

function showResults(responseData) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous content

    // Display Local Government Profile
    resultsDiv.appendChild(createTextSection('Local Government Profile', responseData.local_gov_profile));

    // Display Community Profile
    resultsDiv.appendChild(createTextSection('Community Profile', responseData.community_profile));

    // Separate data into Local Government and Community categories
    const localGovCapacity = filterByCategory(responseData.capacity_scores, 'Local Government');
    const communityCapacity = filterByCategory(responseData.capacity_scores, 'Community');
    const localGovEC = filterByCategory(responseData.ec_scores, 'Local Government');
    const communityEC = filterByCategory(responseData.ec_scores, 'Community');

    // Display Capacity Scores
    resultsDiv.appendChild(createSection('Capacity Scores - Local Government', localGovCapacity));
    resultsDiv.appendChild(createSection('Capacity Scores - Community', communityCapacity));

    // Display EC Scores
    resultsDiv.appendChild(createSection('EC Scores - Local Government', localGovEC));
    resultsDiv.appendChild(createSection('EC Scores - Community', communityEC));
}

// Helper function to filter data by category
function filterByCategory(data, category) {
    const filtered = {};
    for (const [key, value] of Object.entries(data)) {
        if (key.includes(category)) {
            // Simplify the key by removing the category suffix
            const simplifiedKey = key.replace(`-${category}`, '');
            filtered[simplifiedKey] = value;
        }
    }
    return filtered;
}

// Helper function to create a section with a table
function createSection(title, data) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'section';
    const heading = document.createElement('h3');
    heading.textContent = title;
    sectionDiv.appendChild(heading);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const thKey = document.createElement('th');
    thKey.textContent = 'Category';
    const thValue = document.createElement('th');
    thValue.textContent = 'Score';
    headerRow.appendChild(thKey);
    headerRow.appendChild(thValue);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const [key, value] of Object.entries(data)) {
        const row = document.createElement('tr');
        const cellKey = document.createElement('td');
        cellKey.textContent = key;
        const cellValue = document.createElement('td');
        cellValue.textContent = value === null ? 'N/A' : value.toFixed ? value.toFixed(2) : value;
        row.appendChild(cellKey);
        row.appendChild(cellValue);
        tbody.appendChild(row);
    }
    table.appendChild(tbody);
    sectionDiv.appendChild(table);

    return sectionDiv;
}

// Helper function to create a text section
function createTextSection(title, text) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'section';
    const heading = document.createElement('h3');
    heading.textContent = title;
    sectionDiv.appendChild(heading);
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    sectionDiv.appendChild(paragraph);
    return sectionDiv;
}



// Handle submit
document.getElementById("submit").addEventListener("click", () => {

    // // Hide the survey and submit button
    document.getElementById("survey").classList.add("hidden");
    document.getElementById("submit").classList.add("hidden");

    submitAnswers()
    
});
