import { v4 as uuidv4 } from 'uuid';

import { PAYMENT_COLLECTED_BY, PAYMENT_TYPES, PROTOCOL_PAYMENT } from "../../utils/constants.js";
import { protocolConfirm } from '../../utils/protocolApis/index.js';
import OrderMongooseModel from "../db/order.js";

class BppConfirmService {

    /**
     * bpp confirm order
     * @param {Object} confirmRequest 
     * @returns 
     */
    async confirm(confirmRequest = {}) {
        try {

            const response = await protocolConfirm(confirmRequest);

            if(response.error){
                return { message: response.data ,error:response.error};
            }else{
                return { context: confirmRequest.context, message: response.message };
            }

        }
        catch (err) {

            //set confirm request in error data
            err.response.data.confirmRequest =confirmRequest
            throw err;
        }
    }

    pad(str, count=2, char='0') {
        str = str.toString();
        if (str.length < count)
            str = Array(count - str.length).fill(char).join('') + str;
        return str;
    };

    /**
     * bpp confirm order
     * @param {Object} context 
     * @param {Object} order 
     * @returns 
     */
    async confirmV1(context, order = {}) {
        try {

            const provider = order?.items?.[0]?.provider || {};

            const confirmRequest = {
                context: context,
                message: {
                    order: {
                        id: uuidv4(),
                        billing: order.billing_info,
                        items: order?.items.map(item => {
                            return {
                                id: item.id,
                                quantity: item.quantity
                            };
                        }) || [],
                        provider: {
                            id: provider.id,
                            locations: provider.locations.map(location => {
                                return { id: location }
                            })
                        },
                        fulfillments: [{
                            end: {
                                contact: {
                                    email: order.delivery_info.email,
                                    phone: order.delivery_info.phone
                                },
                                location: order.delivery_info.location,
                            },
                            type: order.delivery_info.type,
                            customer: {
                                person: {
                                    name: order.delivery_info.name
                                }
                            },
                            provider_id: provider.id
                        }],
                        payment: {
                            params: {
                                amount: order?.payment?.paid_amount?.toString(),
                                currency: "INR",
                                transaction_id:order?.jusPayTransactionId//payment transaction id
                            },
                            status: order?.payment?.type === PAYMENT_TYPES["ON-ORDER"] ?
                                PROTOCOL_PAYMENT.PAID :
                                PROTOCOL_PAYMENT["NOT-PAID"],
                            type: order?.payment?.type,
                            collected_by: order?.payment?.type === PAYMENT_TYPES["ON-ORDER"] ? 
                                PAYMENT_COLLECTED_BY.BAP : 
                                PAYMENT_COLLECTED_BY.BPP,
                        },
                        quote: {
                            ...order?.quote
                        },
                        created_at:new Date(),
                        updated_at:new Date()
                    }
                }
            }

            console.log("confirmRequest----------v2----------->",confirmRequest.message.order.payment.params);

            return await this.confirm(confirmRequest);
        }
        catch (err) {
            throw err;
        }
    }

    /**
     * bpp confirm order v2
     * @param {Object} context 
     * @param {Object} order 
     * @param {Object} storedOrder 
     * @returns 
     */
    async confirmV2(context, order = {}, storedOrder = {}) {
        try {
            storedOrder = storedOrder?.toJSON();

            const n = new Date();
            const count = await OrderMongooseModel.count({
            });

            console.log("count-------------------------------->",count)

            let orderId = `${n.getFullYear()}-${this.pad(n.getMonth())}-${this.pad(n.getDate())}-${Math.floor(100000 + Math.random() * 900000)}`;

            let qoute = {...(order?.quote || storedOrder?.quote)}

            let value = ""+qoute?.price?.value
            qoute.price.value = value

            console.log("orderId-------------------------------->",orderId)
            console.log("confirm----------------------qoute---------->",qoute)
            console.log("confirm----------------------order?.jusPayTransactionId/---------->",order?.jusPayTransactionId)


            // Created - when created by the buyer app;
            // Accepted - when confirmed by the seller app;
            // In-progress - when order is ready to ship;
            // Completed - when all fulfillments completed
            // Cancelled - when order cancelled

            const confirmRequest = {
                context: context,
                message: {
                    order: {
                        id: orderId,
                        state:"Created",
                        billing: {
                            address: {
                                door: storedOrder?.billing?.address?.door,
                                name: storedOrder?.billing?.address?.name,
                                building: storedOrder?.billing?.address?.building,
                                street: storedOrder?.billing?.address?.street,
                                locality: storedOrder?.billing?.address?.locality,
                                ward: storedOrder?.billing?.address?.ward,
                                city: storedOrder?.billing?.address?.city,
                                state: storedOrder?.billing?.address?.state,
                                country: storedOrder?.billing?.address?.country,
                                area_code: storedOrder?.billing?.address?.areaCode
                            },
                            phone: storedOrder?.billing?.phone,
                            name: storedOrder?.billing?.name,
                            email: storedOrder?.billing?.email,
                        },
                        items: storedOrder?.items && storedOrder?.items?.length &&
                            [...storedOrder?.items].map(item => {
                                return {
                                    id: item.id,
                                    quantity: {
                                        count: item.quantity.count
                                    },
                                    fulfillment_id: item.fulfillment_id
                                };
                            }) || [],
                        provider: storedOrder?.provider,
                        fulfillments: [...storedOrder.fulfillments].map((fulfillment) => {
                            return {
                                id: fulfillment?.id,
                                tracking: fulfillment?.tracking,
                                end: {
                                    contact: {
                                        email: fulfillment?.end?.contact?.email,
                                        phone: fulfillment?.end?.contact?.phone,
                                    },
                                    person: {
                                        name: fulfillment?.customer?.person?.name
                                    },
                                    location: {
                                        gps: fulfillment?.end?.location?.gps,
                                        address: {
                                            door: fulfillment?.end?.location?.address?.door,
                                            name: fulfillment?.end?.location?.address?.name,
                                            building: fulfillment?.end?.location?.address?.building,
                                            street: fulfillment?.end?.location?.address?.street,
                                            locality: fulfillment?.end?.location?.address?.locality,
                                            ward: fulfillment?.end?.location?.address?.ward,
                                            city: fulfillment?.end?.location?.address?.city,
                                            state: fulfillment?.end?.location?.address?.state,
                                            country: fulfillment?.end?.location?.address?.country,
                                            area_code: fulfillment?.end?.location?.address?.areaCode
                                        }
                                    }
                                },
                                type: "Delivery",
                                customer: {
                                    person: {
                                        name: fulfillment?.customer?.person?.name
                                    }
                                },
                                provider_id: storedOrder?.provider?.id
                            }
                        }),
                        payment: {
                            params: {
                                amount: order?.payment?.paid_amount?.toString(),
                                currency: "INR",
                                transaction_id:order?.jusPayTransactionId//payment transaction id
                            },
                            status: order?.payment?.type === PAYMENT_TYPES["ON-ORDER"] ?
                                PROTOCOL_PAYMENT.PAID :
                                PROTOCOL_PAYMENT["NOT-PAID"],
                            type: order?.payment?.type,
                            collected_by: order?.payment?.type === PAYMENT_TYPES["ON-ORDER"] ? 
                                PAYMENT_COLLECTED_BY.BAP : 
                                PAYMENT_COLLECTED_BY.BPP,
                            ...storedOrder.settlementDetails
                        },
                        quote: {
                            ...(qoute)
                        },
                        created_at:new Date(),
                        updated_at:new Date()
                    }
                }
            };

            let confirmResponse = await this.confirm(confirmRequest);

            if(confirmResponse.error){
                //retrial attempt
                console.log("error--------->",confirmResponse.message);


            }

            return confirmResponse

           // return await this.confirm(confirmRequest);
        }
        catch (err) {
            throw err;
        }
    }
}

export default BppConfirmService;
