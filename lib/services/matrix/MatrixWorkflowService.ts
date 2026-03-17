/**
 * Matrix Workflow Integration Service
 * Phase 9: Real HTTP communication with Matrix servers
 * Replaces synthetic stub with actual room creation and messaging
 */

import axios, { AxiosInstance } from "axios";

export interface MatrixConfig {
  homeserverUrl: string;
  accessToken: string;
  userId: string;
}

export interface MatrixRoom {
  roomId: string;
  roomAlias: string;
  displayName: string;
  topic: string;
  encryption: boolean;
}

export interface MatrixMessage {
  messageId: string;
  roomId: string;
  sender: string;
  content: string;
  timestamp: number;
  type: string; // "text" | "event" | "document"
}

export class MatrixWorkflowService {
  private client: AxiosInstance;
  private config: MatrixConfig;

  constructor(config: MatrixConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.homeserverUrl,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Create inspection workflow room for a deal
   */
  async createInspectionRoom(
    dealId: string,
    propertyAddress: string
  ): Promise<MatrixRoom> {
    try {
      const roomName = `inspection-${dealId}`;
      const roomTopic = `Field Inspection Workflow: ${propertyAddress}`;

      const response = await this.client.post("/_matrix/client/r0/createRoom", {
        room_alias_name: roomName,
        visibility: "private",
        name: `Inspection: ${propertyAddress}`,
        topic: roomTopic,
        initial_state: [
          {
            type: "m.room.encryption",
            state_key: "",
            content: {
              algorithm: "m.megolm.v1.aes-sha2",
            },
          },
        ],
      });

      return {
        roomId: response.data.room_id,
        roomAlias: response.data.room_alias,
        displayName: `Inspection: ${propertyAddress}`,
        topic: roomTopic,
        encryption: true,
      };
    } catch (error) {
      console.error("[MatrixService] Error creating inspection room:", error);
      throw error;
    }
  }

  /**
   * Create execution workflow room for tracking construction progress
   */
  async createExecutionRoom(
    dealId: string,
    propertyAddress: string,
    operatorName: string
  ): Promise<MatrixRoom> {
    try {
      const roomName = `execution-${dealId}`;
      const roomTopic = `${operatorName} Execution Workflow: ${propertyAddress}`;

      const response = await this.client.post("/_matrix/client/r0/createRoom", {
        room_alias_name: roomName,
        visibility: "private",
        name: `Execution: ${propertyAddress}`,
        topic: roomTopic,
      });

      return {
        roomId: response.data.room_id,
        roomAlias: response.data.room_alias,
        displayName: `Execution: ${propertyAddress}`,
        topic: roomTopic,
        encryption: false,
      };
    } catch (error) {
      console.error("[MatrixService] Error creating execution room:", error);
      throw error;
    }
  }

  /**
   * Post deficiency notification to inspection room
   */
  async postDeficiencyAlert(
    roomId: string,
    system: string,
    severity: string,
    title: string,
    estimatedCost: number
  ): Promise<MatrixMessage> {
    try {
      const messageBody = `🔧 **${system.toUpperCase()} DEFICIENCY** (${severity})
Title: ${title}
Estimated Cost: $${estimatedCost.toLocaleString()}
Action Required: Review and assign contractor`;

      const response = await this.client.post(
        `/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/send/m.room.message`,
        {
          msgtype: "m.text",
          body: messageBody,
          format: "org.matrix.custom.html",
          formatted_body: `<strong>${system.toUpperCase()} DEFICIENCY</strong> (${severity})<br/>Title: ${title}<br/>Estimated Cost: $${estimatedCost.toLocaleString()}`,
        }
      );

      return {
        messageId: response.data.event_id,
        roomId,
        sender: this.config.userId,
        content: messageBody,
        timestamp: Date.now(),
        type: "event",
      };
    } catch (error) {
      console.error("[MatrixService] Error posting deficiency alert:", error);
      throw error;
    }
  }

  /**
   * Post inspection completion summary
   */
  async postInspectionSummary(
    roomId: string,
    unitCount: number,
    unitsInspected: number,
    totalDeficiencies: number,
    estimatedTotalCost: number,
    samplingConfidence: number
  ): Promise<MatrixMessage> {
    try {
      const inspectionPercent = ((unitsInspected / unitCount) * 100).toFixed(1);
      const messageBody = `✅ **INSPECTION COMPLETE**
Units Inspected: ${unitsInspected}/${unitCount} (${inspectionPercent}%)
Total Deficiencies Found: ${totalDeficiencies}
Estimated Total Cost: $${estimatedTotalCost.toLocaleString()}
Sampling Confidence: ${(samplingConfidence * 100).toFixed(0)}%

Ready for underwriting review.`;

      const response = await this.client.post(
        `/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/send/m.room.message`,
        {
          msgtype: "m.text",
          body: messageBody,
        }
      );

      return {
        messageId: response.data.event_id,
        roomId,
        sender: this.config.userId,
        content: messageBody,
        timestamp: Date.now(),
        type: "event",
      };
    } catch (error) {
      console.error("[MatrixService] Error posting inspection summary:", error);
      throw error;
    }
  }

  /**
   * Invite users to workflow room
   */
  async inviteToRoom(roomId: string, userIds: string[]): Promise<boolean> {
    try {
      for (const userId of userIds) {
        await this.client.post(
          `/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/invite`,
          {
            user_id: userId,
          }
        );
      }
      return true;
    } catch (error) {
      console.error("[MatrixService] Error inviting users:", error);
      throw error;
    }
  }

  /**
   * Post milestone update to execution room
   */
  async postMilestoneUpdate(
    roomId: string,
    milestone: string,
    status: string,
    daysVariance: number
  ): Promise<MatrixMessage> {
    try {
      const varianceLabel = daysVariance > 0 ? `+${daysVariance}` : `${daysVariance}`;
      const varianceStatus =
        daysVariance > 0 ? "⚠️ Delayed" : daysVariance < 0 ? "✅ Ahead" : "✅ On Track";

      const messageBody = `📋 **MILESTONE UPDATE**
${milestone}: ${status}
Timeline Variance: ${varianceLabel} days
Status: ${varianceStatus}`;

      const response = await this.client.post(
        `/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/send/m.room.message`,
        {
          msgtype: "m.text",
          body: messageBody,
        }
      );

      return {
        messageId: response.data.event_id,
        roomId,
        sender: this.config.userId,
        content: messageBody,
        timestamp: Date.now(),
        type: "event",
      };
    } catch (error) {
      console.error("[MatrixService] Error posting milestone update:", error);
      throw error;
    }
  }

  /**
   * Get conversation history from room
   */
  async getRoomMessages(
    roomId: string,
    limit: number = 50
  ): Promise<MatrixMessage[]> {
    try {
      const response = await this.client.get(
        `/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/messages`,
        {
          params: {
            dir: "b",
            limit,
          },
        }
      );

      return response.data.chunk.map((event: any) => ({
        messageId: event.event_id,
        roomId,
        sender: event.sender,
        content: event.content.body,
        timestamp: event.origin_server_ts,
        type: event.type === "m.room.message" ? "text" : "event",
      }));
    } catch (error) {
      console.error("[MatrixService] Error fetching room messages:", error);
      throw error;
    }
  }
}

// Singleton instance (configured via environment variables)
let matrixService: MatrixWorkflowService | null = null;

export function getMatrixService(): MatrixWorkflowService {
  if (!matrixService) {
    const config: MatrixConfig = {
      homeserverUrl: process.env.MATRIX_HOMESERVER_URL || "http://localhost:8008",
      accessToken: process.env.MATRIX_ACCESS_TOKEN || "",
      userId: process.env.MATRIX_USER_ID || "@axiom:matrix.org",
    };

    matrixService = new MatrixWorkflowService(config);
  }

  return matrixService;
}
