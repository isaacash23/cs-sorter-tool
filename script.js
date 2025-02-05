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
    // Keet track of which Q IDs have already been created
    var seenQuestionIDs = new Set()
    for (const q of questions) {
        if (seenQuestionIDs.has(q.id)) {
            continue
        }
        seenQuestionIDs.add(q.id)
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
                <input type="${type}" name = "${q.id}" value="${option.option_code}"> ${option.option_text}
            `;
            questionDiv.appendChild(label);
        });
    
        surveyDiv.appendChild(questionDiv);
    }
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
        
        const selectedOptions = Array.from(selectedInputs).map(input => input.value); // Collect codes of selected inputs
        
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
    console.log(responseData)
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous content

    // Create a container for each row
    const createRow = () => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        return row;
    };

    // Add Local Government and Community profiles
    const profileRow = createRow();
    profileRow.appendChild(createProfileColumn('Local Government Profile:', responseData.local_gov_profile));
    profileRow.appendChild(createProfileColumn('Community Profile:', responseData.community_profile));
    resultsDiv.appendChild(profileRow);

    // Add header row for ECs
    const ecHeaderRow = createRow();
    createAndAppendElement(ecHeaderRow,'h3',"Local Government Enabling Conditions:","ecColumnHeader")
    createAndAppendElement(ecHeaderRow,'h3',"Community Enabling Conditions:","ecColumnHeader")
    resultsDiv.appendChild(ecHeaderRow);

    // Add EC Scores
    const ecRow = createRow();
    ecRow.appendChild(createECColumn(responseData.ec_scores["Local Government"]));
    ecRow.appendChild(createECColumn(responseData.ec_scores["Community"]));
    resultsDiv.appendChild(ecRow);
}

//// Builds the  profile info
function createProfileColumn(title, info) {
    const sectionDiv = document.createElement('div');

    createAndAppendElement(sectionDiv,'h3',title,"profileIntro")
    createAndAppendElement(sectionDiv,'h1',info.profile,"profileName")
    createAndAppendElement(sectionDiv,'p',"Profile explanation:",'paragraphHeader')

    if (info.text == null) {
        var profileDescription = "Could not find profile"
    } else {
        var profileDescription = info.text.description
    }
    createAndAppendElement(sectionDiv,'p',profileDescription)

    return sectionDiv;
}

//// Builds the enabling conditions info
function createECColumn(ecListObject) {
    const ecListDiv = document.createElement('div');
    for (let ec in ecListObject) {
        ecListDiv.append(createECBlock(ec,ecListObject[ec]))
    }
    return ecListDiv
}

function createECBlock(name, info) {
    const ecDiv = document.createElement('div');
    
    createAndAppendElement(ecDiv,'h2',name,"ecName")
    showECLevel(info.level,ecDiv)

    // If the EC could not be found (no text attached), return the error message and stop
    if (info.text == null) {
        const ecErrorMessage = document.createElement('p')
        ecErrorMessage.textContent = textErrorMessage
        ecDiv.appendChild(ecErrorMessage)
        return ecDiv
    }

    createAndAppendElement(ecDiv, 'p', 'Description:', 'paragraphHeader');
    createAndAppendElement(ecDiv, 'p', info.text.description, 'ecExplanation');
    createAndAppendElement(ecDiv, 'p', 'What this means:', 'paragraphHeader');
    createAndAppendElement(ecDiv, 'p', info.text.supports, 'ecExplanation');
    
    ecDiv.className = "ecBlock"
    return ecDiv
}

function showECLevel(level,parent) {
    if (level == null) {
        createAndAppendElement(parent,'p', `Level: "N/A"}`,"ecLevel")
    } else {
        let levelIntro = document.createTextNode("Level: ")
        let coloredScoreText = document.createElement('span')
        coloredScoreText.textContent = level
        coloredScoreText.className = `score${level}`
        let showScore = document.createElement('p')
        showScore.appendChild(levelIntro)
        showScore.appendChild(coloredScoreText)
        showScore.className = "ecLevel"
        parent.appendChild(showScore)
    }
}

// Helper function to create a block of text
function createAndAppendElement(parent, tag, textContent, className = '') {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    element.textContent = textContent;
    parent.appendChild(element);
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


//////// Testing /////////
///// Fills in all questions through a keyboard shortcut. Comment these out after Beta testing.

// Auto-fill in all responses
function selectAllRadios(value) {
    // Get all radio buttons on the page
    const radios = document.querySelectorAll('input[type="radio"]');
    
    // Loop through the radios and select the ones matching the specified value
    radios.forEach(radio => {
        if (radio.value === value) {
            radio.checked = true;
        }
    });
}

document.addEventListener("keydown", (event) => {
    // Check if the desired key combination is pressed
    if (event.ctrlKey && event.shiftKey && (event.metaKey || event.altKey) && event.code === "KeyS") {
        // Prevent default behavior if needed
        event.preventDefault();

        // Call the function to select all radios
        selectAllRadios("5"); // Replace "option1" with the desired value
    }
});
