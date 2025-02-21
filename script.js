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
    // const profileRow = createRow();
    // profileRow.appendChild(createProfileColumn('Local Government Profile:', responseData.local_gov_profile));
    // profileRow.appendChild(createProfileColumn('Community Profile:', responseData.community_profile));
    // resultsDiv.appendChild(profileRow);

    // Add header row for ECs
    const ecHeaderRow = createRow();
    createAndAppendElement(ecHeaderRow,'h3',"Local Government Enabling Conditions:","ecColumnHeader")
    createAndAppendElement(ecHeaderRow,'h3',"Community Enabling Conditions:","ecColumnHeader")
    resultsDiv.appendChild(ecHeaderRow);

    // Add elements for charts
    var govECNamesAndScores = []
    var communityECNamesAndScores = []
    const chartRow = createRow();
    var govChart = document.createElement('div');
    var communityChart = document.createElement('div')
    chartRow.appendChild(govChart)
    chartRow.appendChild(communityChart)
    resultsDiv.appendChild(chartRow);

    // Add EC Scores
    const ecRow = createRow();
    ecRow.appendChild(createECColumn(responseData.ec_scores["Local Government"],govECNamesAndScores));
    ecRow.appendChild(createECColumn(responseData.ec_scores["Community"],communityECNamesAndScores));
    resultsDiv.appendChild(ecRow);

    // Fill in charts with EC scores
    createBarChart(govChart,govECNamesAndScores)
    createBarChart(communityChart,communityECNamesAndScores)
}

//// Builds the  profile info
// function createProfileColumn(title, info) {
//     const sectionDiv = document.createElement('div');

//     createAndAppendElement(sectionDiv,'h3',title,"profileIntro")
//     createAndAppendElement(sectionDiv,'h1',info.profile,"profileName")
//     createAndAppendElement(sectionDiv,'p',"Profile explanation:",'paragraphHeader')

//     if (info.text == null) {
//         var profileDescription = "Could not find profile"
//     } else {
//         var profileDescription = info.text.description
//     }
//     createAndAppendElement(sectionDiv,'p',profileDescription)

//     return sectionDiv;
// }

/// Makes the bar chart with results
function createBarChart(wrapperElement,scoreTracker) {
    wrapperElement.className = "chart-wrapper"

    chartCanvas = document.createElement('canvas')
    wrapperElement.appendChild(chartCanvas)
    
    const ecLabels = scoreTracker.map(row => row[0])
    const ecScores = scoreTracker.map(row => row[1])
    const ecDivElements = scoreTracker.map(row => row[2])

    const chart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: ecLabels,
            datasets: [{
                data: ecScores,
                backgroundColor: ecScores.map(score => getBarColor(score))
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bars
            plugins: {
                legend: { display: false } // Hide legend
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    ecDivElements[index]?.scrollIntoView({ behavior: 'smooth' });
                } 
            }
        }
    });

    function getBarColor(score) {
        // Base color in HSL format (blue: 210° hue)
        const minLightness = 80; // Lightest color
        const maxLightness = 30; // Darkest color

        // Map score to lightness value (inverted: higher score = darker)
        const lightness = minLightness - score * (minLightness - maxLightness);

        return `hsl(210, 100%, ${lightness}%)`; // HSL format keeps saturation constant
    }
}

//// Builds the enabling conditions info
function createECColumn(ecListObject,scoreTracker) {
    const ecListDiv = document.createElement('div');
    for (let ec in ecListObject) {
        info = ecListObject[ec]
        ecListDiv.append(createECBlock(ec,info,scoreTracker))
    }
    return ecListDiv
}

function createECBlock(name, info, scoreTracker) {
    const ecDiv = document.createElement('div');
    
    createAndAppendElement(ecDiv,'h2',name,"ecName")
    
    // Calculate a score out of 5, also show the exact score 0-1
    createAndAppendElement(ecDiv, 'p',`Level: ${Math.min(Math.floor(info.score * 5) + 1, 5)} out of 5`,'ecLevel')
    createAndAppendElement(ecDiv, 'p',`Exact score: ${info.score.toFixed(2)}`,'ecLevel')
    // showECLevel(info.level,ecDiv)

    // If the EC could not be found (no text attached), return the error message and stop
    if (info.text == null) {
        const ecErrorMessage = document.createElement('p')
        ecErrorMessage.textContent = textErrorMessage
        ecDiv.appendChild(ecErrorMessage)
        return ecDiv
    }

    createAndAppendElement(ecDiv, 'p', 'Overall description:', 'paragraphHeader');
    createAndAppendElement(ecDiv, 'p', info.text.overall, 'ecExplanation');
    createAndAppendElement(ecDiv, 'p', 'What a high score means:', 'paragraphHeader');
    createAndAppendElement(ecDiv, 'p', info.text.high, 'ecExplanation');
    createAndAppendElement(ecDiv, 'p', 'What a low score means:', 'paragraphHeader');
    createAndAppendElement(ecDiv, 'p', info.text.low, 'ecExplanation');
    
    ecDiv.className = "ecBlock"
    scoreTracker.push([name,info.score,ecDiv])
    return ecDiv
}

// function showECLevel(level,parent) {
//     if (level == null) {
//         createAndAppendElement(parent,'p', `Level: "N/A"`,"ecLevel")
//     } else {
//         let levelIntro = document.createTextNode("Level: ")
//         let coloredScoreText = document.createElement('span')
//         coloredScoreText.textContent = level
//         coloredScoreText.className = `score${level}`
//         let showScore = document.createElement('p')
//         showScore.appendChild(levelIntro)
//         showScore.appendChild(coloredScoreText)
//         showScore.className = "ecLevel"
//         parent.appendChild(showScore)
//     }
// }

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
    
    if (event.shiftKey && (event.ctrlKey || event.metaKey || event.altKey)) {
        // Prevent default behavior if needed
        event.preventDefault();

        // Fill out questions randomly
        if (event.code === "KeyS") {
            

            document.querySelectorAll('input[type="radio"]').forEach(radio => {
                let group = document.querySelectorAll(`input[name="${radio.name}"]`);
                let randomChoice = group[Math.floor(Math.random() * group.length)];
                randomChoice.checked = true;
                randomChoice.dispatchEvent(new Event('change', { bubbles: true }));
            });

            document.querySelectorAll('input[type="checkbox"]').forEach(input => {
                if (Math.random() < 0.5) { // 50% chance to check the input
                    input.checked = true;
                    input.dispatchEvent(new Event('change', { bubbles: true })); // Trigger event if needed
                } else {
                    input.checked = false;
                }
            });
        }
        
        // Fill out specific code
        if (['1','2','3','4','5','6'].includes(event.key)) {
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                if (checkbox.value === Number(event.key)) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }

    }
});
