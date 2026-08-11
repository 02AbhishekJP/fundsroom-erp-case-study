# AWS EC2 Deployment Guide

This project is fully containerized with Docker Compose, making it highly portable and easy to deploy on an AWS EC2 instance. 

Follow these steps to deploy the Fundsroom ERP system to AWS.

## 1. AWS Server Setup (EC2)

1. Log in to the **AWS Management Console** and navigate to **EC2**.
2. Click **Launch Instance**.
3. **Name**: `fundsroom-erp-server`
4. **AMI**: Select **Ubuntu Server 24.04 LTS** (or 22.04 LTS).
5. **Instance Type**: `t2.micro` or `t3.micro` (Free Tier eligible is fine, though `t3.small` is recommended for better build performance).
6. **Key Pair**: Create a new key pair (RSA, `.pem`) and download it.
7. **Network Settings** (Security Group):
   - Check **Allow SSH traffic from Anywhere** (Port 22)
   - Check **Allow HTTP traffic from the internet** (Port 80)
   - Add a Custom TCP Rule for **Port 8080** (Frontend UI)
   - Add a Custom TCP Rule for **Port 3000** (Backend API - optional, if you need direct API access)

8. Click **Launch Instance**.

## 2. Connect to Your EC2 Instance

Open your terminal and use the downloaded `.pem` key to connect to your server. Replace the IP address with your EC2 instance's Public IPv4 address.

```bash
# Set secure permissions on your key
chmod 400 your-key.pem

# SSH into the server
ssh -i "your-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

## 3. Install Docker and Docker Compose

Once logged into the EC2 instance, update the system and install Docker:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker and Git
sudo apt install -y docker.io docker-compose-v2 git

# Enable Docker to start on boot
sudo systemctl enable docker
sudo systemctl start docker

# Add ubuntu user to docker group (so you don't need sudo for docker commands)
sudo usermod -aG docker ubuntu

# *IMPORTANT*: Log out and log back in for group changes to take effect
exit
# (Run the SSH command again to reconnect)
```

## 4. Clone the Repository

Clone your private GitHub repository containing the project onto the EC2 server:

```bash
git clone https://github.com/yourusername/fundsroom-erp-case-study.git
cd fundsroom-erp-case-study
```
*(Note: If your repository is private, you may need to generate a Personal Access Token on GitHub to use as your password during the clone).*

## 5. Configure Environment Variables

The application relies heavily on environment variables for security and configuration. You must create a production `.env` file before building.

```bash
nano .env
```

Paste the following configuration, replacing `YOUR_EC2_PUBLIC_IP` with your actual EC2 public IP address:

```env
# Database Credentials
DB_USER=erp_admin
DB_PASSWORD=your_secure_db_password
DB_NAME=fundsroom_prod

# Backend Settings
JWT_SECRET=generate_a_very_long_random_string_here
PORT=3000

# Frontend Build Variable (REQUIRED)
# This bakes the API URL into the React frontend.
# Do NOT use localhost here. Use your EC2 Public IP.
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:3000/api
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

## 6. Build and Deploy

With the environment configured, use Docker Compose to build the images and launch the cluster in detached mode:

```bash
docker compose --env-file .env up --build -d
```

Docker will:
1. Pull the PostgreSQL image and start the database.
2. Build the Node.js backend.
3. Build the React frontend (injecting the `VITE_API_URL` variable) and serve it via Nginx.

## 7. Verify the Deployment

Ensure all three containers (`fundsroom-erp-db`, `fundsroom-erp-backend`, `fundsroom-erp-frontend`) are running successfully:

```bash
docker ps
```

## 8. Access the Application

Your application is now live on the internet! 
Open your web browser and navigate to your EC2 instance's IP address on port 8080:

**http://YOUR_EC2_PUBLIC_IP:8080**

You can log in using the seeded default credentials:
- **Email**: `admin@fundsroom.com`
- **Password**: `password123`
