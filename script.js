const SORTER_API_URL = "https://script.google.com/macros/s/AKfycbyWfDz3H40k9YrDG3sXsjtXWX8-l1i5gp51CnFXDinKPLEzJqKo34NDDuRQvxIcaFbbwQ/exec"
const TEST_API_URL = "https://script.google.com/macros/s/AKfycbwBBpviDWh21a2tBaf1rgV0akY7E94VFGm9dPa4pnuD5ToHQp5Pn8Pa4vcT2_1M-k-7/exec"

const textErrorMessage = "Insufficient information to determine EC level"

//////// Build out the questions page ///////////

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

        //Decide whether the selection should be single (radio) or multiple (checkbox). Default to radio
        var type = "radio"
        if (q.type == "Multiple Selection") {
            var type = "checkbox"
        }
        
        q.options.forEach((option) => {
            const label = document.createElement("label");
            label.innerHTML = `
                <input type="${type}" name = "${q.id}" code="${option.option_code}"> ${option.option_text}
            `;
            questionDiv.appendChild(label);
        });
    
        surveyDiv.appendChild(questionDiv);
    });
}

// Load survey
const surveyDiv = document.getElementById("survey");

fillInQuestions()

/////// Find the results when the user submits /////////////

//Get the answers the user has selected for each question
function getSelectedAnswers() {
    const selectedAnswers = {};
    const questions = document.querySelectorAll('.question');

    questions.forEach((questionDiv) => {
        const questionId = questionDiv.querySelector('input[type="radio"], input[type="checkbox"]').name; // Get the name attribute
        const selectedInputs = questionDiv.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked'); // Get selected inputs (radio or checkbox)
        
        const selectedOptions = Array.from(selectedInputs).map(input => input.getAttribute('code')); // Collect codes of selected inputs
        
        // Save the selected options or null if none selected
        selectedAnswers[questionId] = selectedOptions.length > 0 ? selectedOptions : null;
    });    

    return selectedAnswers;
}

// Send the answers through a POST call

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

/// Display the results

function showResults(responseData) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous content

    // Create a container for each row
    const createRow = () => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.marginBottom = '20px'; // Add spacing between rows
        return row;
    };

    // Add Local Government and Community profiles
    const profileRow = createRow();
    profileRow.appendChild(createProfileDisplay('Local Government Profile:', responseData.local_gov_profile.profile));
    profileRow.appendChild(createProfileDisplay('Community Profile:', responseData.community_profile.profile));
    resultsDiv.appendChild(profileRow);

    // Add EC Scores
    const ecRow = createRow();
    ecRow.appendChild(createECColumn(responseData.ec_scores["Local Government"]));
    ecRow.appendChild(createECColumn(responseData.ec_scores["Community"]));
    resultsDiv.appendChild(ecRow);
}

function createECColumn(ecListObject) {
    const ecListDiv = document.createElement('div');
    for (let ec in ecListObject) {
        ecListDiv.append(createECBlock(ec,ecListObject[ec]))
    }
    return ecListDiv
}

function createECBlock(name, info) {
    console.log(info)
    const ecDiv = document.createElement('div');

    const ecTitle = document.createElement('h2');
    ecTitle.textContent = name;
    ecDiv.appendChild(ecTitle)

    const level = document.createElement('p');
    level.textContent = `Level: ${info.level ?? "N/A"}`
    ecDiv.appendChild(level)

    // If the EC could not be found (no text attached), return the error message and stop
    if (info.text == null) {
        const ecErrorMessage = document.createElement('p')
        ecErrorMessage.textContent = textErrorMessage
        ecDiv.appendChild(ecErrorMessage)
        return ecDiv
    }

    const descriptionTitle = document.createElement('p')
    descriptionTitle.className = "paragraphHeader"
    descriptionTitle.textContent = "Description:"
    ecDiv.appendChild(descriptionTitle)

    const description = document.createElement('p')
    description.className = "ecExplanation"
    description.textContent = info.text.description
    ecDiv.appendChild(description)

    const supportsTitle = document.createElement('p')
    supportsTitle.className = "paragraphHeader"
    supportsTitle.textContent = "What this means:"
    ecDiv.appendChild(supportsTitle)

    const supports = document.createElement('p')
    supports.className = "paragraphHeader"
    supports.textContent = info.text.supports
    ecDiv.appendChild(supports)

    return ecDiv
}

// Helper function to create a text section
function createProfileDisplay(title, text) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'section';
    const heading = document.createElement('h3');
    heading.textContent = title;
    sectionDiv.appendChild(heading);
    const paragraph = document.createElement('h1');
    paragraph.textContent = text;
    paragraph.style.color = "#1b263b";
    sectionDiv.appendChild(paragraph);
    return sectionDiv;
}

////// User Interaction ////////


// Handle submit
document.getElementById("submit").addEventListener("click", () => {

    // // Hide the survey and submit button
    document.getElementById("survey").classList.add("hidden");
    document.getElementById("submit").classList.add("hidden");
    document.getElementById("results").classList.remove("hidden");
    document.getElementById("back").classList.remove("hidden");

    submitAnswers()
    
});

document.getElementById("back").addEventListener("click", () => {
    document.getElementById("results").classList.add("hidden");
    document.getElementById("back").classList.add("hidden");
    document.getElementById("survey").classList.remove("hidden");
    document.getElementById("submit").classList.remove("hidden");

});
