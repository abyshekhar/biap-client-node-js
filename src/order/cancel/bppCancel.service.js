import { protocolCancel } from "../../utils/protocolApis/index.js";

class BppCancelService {

    /**
     * 
     * @param {Object} context 
     * @param {String} orderId 
     * @param {String} cancellationReasonId 
     * @returns 
     */
    async cancelOrder(context, orderId, cancellationReasonId = "1") {
        try {

            const cancelRequest = {
                context: context,
                message: {
                    order_id: orderId,
                    cancellation_reason_id: "1"
                }
            }

            const response = await protocolCancel(cancelRequest);

            return { context: context, message: response.message };
        }
        catch (err) {
            throw err;
        }
    }
}

export default BppCancelService;
