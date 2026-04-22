# DeNet Datakeeper Node — Google Cloud Deployment Guide

**Version:** 1.0  
**Date:** February 10, 2026  
**Purpose:** Deploy and run a DeNet Datakeeper Node on Google Cloud Compute Engine for 24/7 PEAQ token earnings.

---

## Prerequisites

Before starting, confirm you have:

1. **Datakeeper License** — ERC-721 NFT on peaq Network (verify at `https://peaq.subscan.io/account/YOUR_ADDRESS`)
2. **Private Key** — 64-character hex key for the wallet holding the license
3. **License Number** — Your Datakeeper License token ID
4. **Google Cloud Account** — With billing enabled
5. **PEAQ Balance** — Tokens are distributed automatically; contact DeNet support on Discord if balance is zero

---

## Step 1: Create Google Cloud VM

### Option A: gcloud CLI

```bash
gcloud compute instances create denet-datakeeper \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --boot-disk-size=200GB \
  --boot-disk-type=pd-ssd \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=denet-node
```

### Option B: Google Cloud Console (Web UI)

1. Go to **Compute Engine > VM instances > Create Instance**
2. Configure:
   - **Name:** `denet-datakeeper`
   - **Region/Zone:** Choose closest to you (e.g., `us-central1-a`)
   - **Machine type:** `e2-medium` (2 vCPU, 4 GB RAM) — sufficient for DeNet
   - **Boot disk:** Ubuntu 22.04 LTS, 200 GB SSD persistent disk
3. Click **Create**

### Recommended VM Specs

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 2 GB | 4 GB |
| Disk | 100 GB SSD | 200 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Monthly Cost | ~$18/mo | ~$25/mo |

---

## Step 2: SSH Into the VM

```bash
gcloud compute ssh denet-datakeeper --zone=us-central1-a
```

Or use the **SSH** button in the Google Cloud Console.

---

## Step 3: Install DeNet Datakeeper Node

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Create directory
mkdir -p ~/denet
cd ~/denet

# Download the latest DeNet node binary (Linux x86_64)
curl -LO https://github.com/DeNetPRO/Node/releases/download/v4.0.1-rc10/denode-linux-amd64

# Rename and make executable
mv denode-linux-amd64 denode
chmod +x denode

# Verify it runs
./denode --version
```

---

## Step 4: Configure the Node

Run the node for initial configuration:

```bash
cd ~/denet
./denode
```

The interactive setup will ask for:
1. **Private Key** — Paste your 64-character hex key (the wallet holding your Datakeeper License)
2. **License Number** — Your Datakeeper License token ID
3. **Storage Path** — Where to store data (default: current directory, or point to the SSD)
4. **Password** — Set a password for encrypting the local keystore

After configuration completes, stop the node with `Ctrl+C`.

---

## Step 5: Set Up as systemd Service (24/7 Operation)

Create a service file so the node auto-starts on boot and restarts on failure:

```bash
sudo nano /etc/systemd/system/denode.service
```

Paste this content (replace `YOUR_USERNAME`, `YOUR_PASSWORD`, `YOUR_ADDRESS`, and `YOUR_LICENSE`):

```ini
[Unit]
Description=DeNet Datakeeper Node
After=network.target
Wants=network-online.target

[Service]
User=YOUR_USERNAME
Group=YOUR_USERNAME
Type=simple
WorkingDirectory=/home/YOUR_USERNAME/denet
Environment="DENODE_PASSWORD=YOUR_PASSWORD"
ExecStart=/home/YOUR_USERNAME/denet/denode --address YOUR_ADDRESS --license YOUR_LICENSE
Restart=always
RestartSec=10
StandardOutput=append:/home/YOUR_USERNAME/denet/denode.log
StandardError=append:/home/YOUR_USERNAME/denet/denode-error.log

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable denode.service
sudo systemctl start denode.service

# Verify it's running
sudo systemctl status denode.service
```

---

## Step 6: Verify Node Is Online

```bash
# Check service status
sudo systemctl status denode.service

# View live logs
tail -f ~/denet/denode.log

# Check process
ps aux | grep denode
```

You should see the node connecting to the DeNet network, discovering peers, and starting to serve storage requests.

---

## Step 7: Set Up Monitoring

### Basic Log Monitoring

```bash
# Watch for errors
grep -i "error\|fail\|warn" ~/denet/denode.log | tail -20

# Check disk usage
df -h /home/YOUR_USERNAME/denet/
```

### Google Cloud Monitoring (Optional)

1. Go to **Monitoring > Uptime Checks** in Google Cloud Console
2. Create an uptime check for your VM's health
3. Set up alerts for VM downtime

### Axiom Dashboard Integration

Your Axiom Protocol dashboard at `/depin/denet` will monitor the node remotely. Set the `DENET_NODE_KEY` environment variable in the Axiom app to enable live metrics from your running node.

---

## Step 8: Running Multiple Nodes (Optional)

If you have multiple Datakeeper Licenses, you can run up to 10 nodes per machine:

```bash
# Create separate directories
mkdir -p ~/denet-node1 ~/denet-node2

# Copy binary
cp ~/denet/denode ~/denet-node1/
cp ~/denet/denode ~/denet-node2/

# Configure each with different license numbers
cd ~/denet-node1 && ./denode  # Use license 1
cd ~/denet-node2 && ./denode  # Use license 2

# Create separate systemd services for each (denode1.service, denode2.service)
```

---

## Maintenance Commands

| Action | Command |
|--------|---------|
| Start node | `sudo systemctl start denode.service` |
| Stop node | `sudo systemctl stop denode.service` |
| Restart node | `sudo systemctl restart denode.service` |
| Check status | `sudo systemctl status denode.service` |
| View logs | `tail -f ~/denet/denode.log` |
| Check disk | `df -h` |
| Update binary | Download new release, replace `~/denet/denode`, restart service |

---

## Cost Estimation

| Item | Monthly Cost |
|------|-------------|
| e2-medium VM | ~$25 |
| 200 GB SSD | ~$17 |
| Network egress (estimated) | ~$5 |
| **Total** | **~$47/mo** |

**Revenue:** PEAQ token earnings from storage provisioning (variable, depends on network demand and uptime).

---

## Troubleshooting

### Node won't start
- Check logs: `journalctl -u denode.service -n 50`
- Verify private key and license number are correct
- Ensure PEAQ balance is non-zero (contact DeNet Discord support)

### Node keeps disconnecting
- Check internet connectivity: `ping -c 5 8.8.8.8`
- Verify firewall isn't blocking outbound connections
- Check disk space: `df -h`

### Low earnings
- Ensure 24/7 uptime (check `systemctl status`)
- Node reputation builds over time — consistent uptime improves earnings
- More disk space = more storage capacity = more earning potential

### Update to latest version
```bash
sudo systemctl stop denode.service
cd ~/denet
curl -LO https://github.com/DeNetPRO/Node/releases/download/LATEST_VERSION/denode-linux-amd64
mv denode-linux-amd64 denode
chmod +x denode
sudo systemctl start denode.service
```

---

## Security Notes

- **Never share your private key** — Store it only in the systemd service file with restricted permissions
- **Restrict service file permissions:** `sudo chmod 600 /etc/systemd/system/denode.service`
- **Use SSH keys** instead of passwords for VM access
- **Enable Google Cloud firewall** — Only allow SSH (port 22) inbound; DeNet uses outbound connections
- **Regular updates** — Keep both the OS and DeNet binary updated

---

## Integration with Axiom Protocol

This DeNet node serves as Axiom's DePIN infrastructure layer:

1. **Revenue stream** — PEAQ token earnings contribute to the $100/week operational playbook
2. **Decentralized storage** — Can store property documents, audit records, and protocol data
3. **Sovereignty** — Eliminates dependency on centralized cloud storage for critical data
4. **Monitoring** — Track node health and earnings via the Axiom dashboard at `/depin/denet`

The Axiom dashboard pulls metrics from your node via the DeNet API. Ensure `DENET_NODE_KEY` is configured in the Axiom environment to enable live monitoring.
