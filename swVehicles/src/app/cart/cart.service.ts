import { computed, Injectable } from "@angular/core";
import { combineLatest, map, scan, shareReplay, Subject } from "rxjs";
import { Vehicle } from "../vehicles/vehicle";
import { Action, CartItem } from "./cart";
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  // Add item action
  private itemSubject = new Subject<Action<CartItem>>();
  itemAction$ = this.itemSubject.asObservable();
  private cartItemsValue: CartItem[] = [];

  private itemAction = toSignal(this.itemAction$);

  cartItems = computed(() => {
    let signalValue = this.itemAction();
    this.cartItemsValue = this.modifyCart(this.cartItemsValue, signalValue!);
    return this.cartItemsValue;
  });

  cartItems$ = this.itemAction$
    .pipe(
      scan((items, itemAction) =>
        this.modifyCart(items, itemAction), [] as CartItem[]),
      shareReplay(1)
    );

  // Total up the extended price for each item
  subTotal = computed(() => this.cartItems().reduce((a, b) => a + (b.quantity * Number(b.vehicle.cost_in_credits)), 0));

  // Delivery is free if spending more than 100,000 credits
  deliveryFee = computed(() => this.subTotal() < 100000 ? 999 : 0);

  // Tax could be based on shipping address zip code
  tax = computed(() => this.subTotal() * 10.75 / 100);

  // Total price
  totalPrice = computed(() => {
     return this.subTotal() + this.deliveryFee() + this.tax()
  });

  // Add the vehicle to the cart as an Action<CartItem>
  addToCart(vehicle: Vehicle): void {
    this.itemSubject.next({
      item: { vehicle, quantity: 1 },
      action: 'add'
    });
  }

  // Remove the item from the cart
  removeFromCart(cartItem: CartItem): void {
    this.itemSubject.next({
      item: { vehicle: cartItem.vehicle, quantity: 0 },
      action: 'delete'
    });
  }

  updateInCart(cartItem: CartItem, quantity: number) {
    this.itemSubject.next({
      item: { vehicle: cartItem.vehicle, quantity },
      action: 'update'
    });
  }

  // Return the updated array of cart items
  private modifyCart(items: CartItem[], operation: Action<CartItem>): CartItem[] {
    if (operation.action === 'add') {
      return [...items, operation.item];
    } else if (operation.action === 'update') {
      return items.map(item => item.vehicle.name === operation.item.vehicle.name ? operation.item : item)
    } else if (operation.action === 'delete') {
      return items.filter(item => item.vehicle.name !== operation.item.vehicle.name);
    }
    return [...items];
  }

}
