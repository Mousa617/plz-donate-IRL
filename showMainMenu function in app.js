function showMainMenu() {
  return new Promise((resolve) => {
    // Create main menu container
    const menuContainer = document.createElement('div');
    menuContainer.id = 'main-menu';
    menuContainer.style.position = 'fixed';
    menuContainer.style.top = '0';
    menuContainer.style.left = '0';
    menuContainer.style.width = '100%';
    menuContainer.style.height = '100%';
    menuContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    menuContainer.style.display = 'flex';
    menuContainer.style.flexDirection = 'column';
    menuContainer.style.alignItems = 'center';
    menuContainer.style.justifyContent = 'center';
    menuContainer.style.zIndex = '3000';
    
    // Create title
    const title = document.createElement('h1');
    title.textContent = 'Donation Booth Multiplayer';
    title.style.color = 'white';
    title.style.marginBottom = '20px';
    title.style.fontSize = '36px';
    
    // Create form container
    const formContainer = document.createElement('div');
    formContainer.style.width = '100%';
    formContainer.style.maxWidth = '400px';
    formContainer.style.padding = '20px';
    formContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    formContainer.style.borderRadius = '10px';
    
    // Create name input
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Enter your name:';
    nameLabel.style.color = 'white';
    nameLabel.style.display = 'block';
    nameLabel.style.marginBottom = '10px';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Your name';
    nameInput.maxLength = '20';
    nameInput.style.width = '100%';
    nameInput.style.padding = '10px';
    nameInput.style.fontSize = '16px';
    nameInput.style.borderRadius = '5px';
    nameInput.style.border = 'none';
    nameInput.style.marginBottom = '20px';
    
    // Create PayPal donation link input
    const paypalLabel = document.createElement('label');
    paypalLabel.textContent = 'Enter your PayPal donation link:';
    paypalLabel.style.color = 'white';
    paypalLabel.style.display = 'block';
    paypalLabel.style.marginBottom = '10px';
    
    const paypalInput = document.createElement('input');
    paypalInput.type = 'text';
    paypalInput.placeholder = 'https://paypal.me/yourusername';
    paypalInput.style.width = '100%';
    paypalInput.style.padding = '10px';
    paypalInput.style.fontSize = '16px';
    paypalInput.style.borderRadius = '5px';
    paypalInput.style.border = 'none';
    paypalInput.style.marginBottom = '20px';
    
    // Help text for PayPal
    const helpText = document.createElement('p');
    helpText.textContent = 'Create your PayPal.me link at paypal.me';
    helpText.style.color = '#CCC';
    helpText.style.fontSize = '12px';
    helpText.style.marginBottom = '20px';
    
    // Create booth text input
    const boothTextLabel = document.createElement('label');
    boothTextLabel.textContent = 'Enter your booth text:';
    boothTextLabel.style.color = 'white';
    boothTextLabel.style.display = 'block';
    boothTextLabel.style.marginBottom = '10px';
    
    const boothTextInput = document.createElement('textarea');
    boothTextInput.placeholder = 'Please Donate!';
    boothTextInput.style.width = '100%';
    boothTextInput.style.padding = '10px';
    boothTextInput.style.fontSize = '16px';
    boothTextInput.style.borderRadius = '5px';
    boothTextInput.style.border = 'none';
    boothTextInput.style.marginBottom = '20px';
    boothTextInput.style.height = '60px';
    boothTextInput.style.resize = 'none';
    boothTextInput.maxLength = 60;
    
    // Create start button
    const startButton = document.createElement('button');
    startButton.textContent = 'Start Game';
    startButton.style.padding = '10px 20px';
    startButton.style.fontSize = '18px';
    startButton.style.backgroundColor = '#4CAF50';
    startButton.style.color = 'white';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '5px';
    startButton.style.cursor = 'pointer';
    startButton.style.width = '100%';
    
    // Add event listener to start button
    startButton.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const paypalDonationLink = paypalInput.value.trim();
      const boothText = boothTextInput.value.trim();
      document.body.removeChild(menuContainer);
      resolve({ playerName: name, paypalDonationLink, boothText });
    });
    
    // Add elements to form container
    formContainer.appendChild(nameLabel);
    formContainer.appendChild(nameInput);
    formContainer.appendChild(paypalLabel);
    formContainer.appendChild(paypalInput);
    formContainer.appendChild(helpText);
    formContainer.appendChild(boothTextLabel);
    formContainer.appendChild(boothTextInput);
    formContainer.appendChild(startButton);
    
    // Add elements to menu container
    menuContainer.appendChild(title);
    menuContainer.appendChild(formContainer);
    
    // Add menu to body
    document.body.appendChild(menuContainer);
    
    // Auto focus the name input
    nameInput.focus();
  });
}